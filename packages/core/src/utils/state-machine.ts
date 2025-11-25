export enum ConversionState {
  PENDING = 'pending',
  RATE_LOCKED = 'rate_locked',
  PHASE1_PREPARED = 'phase1_prepared',
  PHASE2_COMMITTED = 'phase2_committed',
  PHASE3_CONFIRMED = 'phase3_confirmed',
  IN_PROGRESS = 'in_progress',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface StateTransition {
  from: ConversionState;
  to: ConversionState;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export class ConversionStateMachine {
  private currentState: ConversionState;
  private history: StateTransition[] = [];

  // Define valid state transitions
  private readonly validTransitions: Map<ConversionState, ConversionState[]> = new Map([
    [ConversionState.PENDING, [ConversionState.RATE_LOCKED, ConversionState.PHASE1_PREPARED, ConversionState.FAILED]],
    [ConversionState.RATE_LOCKED, [ConversionState.PHASE1_PREPARED, ConversionState.FAILED]],
    [ConversionState.PHASE1_PREPARED, [ConversionState.PHASE2_COMMITTED, ConversionState.FAILED]],
    [ConversionState.PHASE2_COMMITTED, [ConversionState.PHASE3_CONFIRMED, ConversionState.FAILED]],
    [ConversionState.PHASE3_CONFIRMED, [ConversionState.IN_PROGRESS, ConversionState.FAILED]],
    [ConversionState.IN_PROGRESS, [ConversionState.CONFIRMED, ConversionState.FAILED]],
    [ConversionState.CONFIRMED, [ConversionState.COMPLETED, ConversionState.FAILED]],
    [ConversionState.COMPLETED, []],
    [ConversionState.FAILED, []]
  ]);

  constructor(initialState: ConversionState = ConversionState.PENDING) {
    this.currentState = initialState;
    this.history.push({
      from: initialState,
      to: initialState,
      timestamp: new Date()
    });
  }

  /**
   * Get current state
   */
  getState(): ConversionState {
    return this.currentState;
  }

  /**
   * Attempt to transition to a new state
   */
  transition(newState: ConversionState, metadata?: Record<string, unknown>): boolean {
    if (!this.canTransition(newState)) {
      throw new Error(
        `Invalid transition from ${this.currentState} to ${newState}`
      );
    }

    const transition: StateTransition = {
      from: this.currentState,
      to: newState,
      timestamp: new Date(),
      metadata
    };

    this.history.push(transition);
    this.currentState = newState;

    return true;
  }

  /**
   * Check if transition to a state is valid
   */
  canTransition(newState: ConversionState): boolean {
    const validStates = this.validTransitions.get(this.currentState);
    return validStates ? validStates.includes(newState) : false;
  }

  /**
   * Get state transition history
   */
  getHistory(): StateTransition[] {
    return [...this.history];
  }

  /**
   * Get last transition
   */
  getLastTransition(): StateTransition | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  /**
   * Check if conversion is in a terminal state
   */
  isTerminal(): boolean {
    return this.currentState === ConversionState.COMPLETED ||
      this.currentState === ConversionState.FAILED;
  }

  /**
   * Check if conversion failed
   */
  hasFailed(): boolean {
    return this.currentState === ConversionState.FAILED;
  }

  /**
   * Check if conversion completed successfully
   */
  isCompleted(): boolean {
    return this.currentState === ConversionState.COMPLETED;
  }

  /**
   * Get progress percentage (0-100)
   */
  getProgressPercentage(): number {
    const stateOrder: ConversionState[] = [
      ConversionState.PENDING,
      ConversionState.RATE_LOCKED,
      ConversionState.PHASE1_PREPARED,
      ConversionState.PHASE2_COMMITTED,
      ConversionState.PHASE3_CONFIRMED,
      ConversionState.IN_PROGRESS,
      ConversionState.CONFIRMED,
      ConversionState.COMPLETED
    ];

    const currentIndex = stateOrder.indexOf(this.currentState);
    if (currentIndex === -1) return 0;

    return Math.round((currentIndex / (stateOrder.length - 1)) * 100);
  }

  /**
   * Get human-readable phase name
   */
  getPhaseName(): string {
    const phaseNames: Record<ConversionState, string> = {
      [ConversionState.PENDING]: 'Initializing',
      [ConversionState.RATE_LOCKED]: 'Rate Locked',
      [ConversionState.PHASE1_PREPARED]: 'Phase 1: Preparing',
      [ConversionState.PHASE2_COMMITTED]: 'Phase 2: Committing',
      [ConversionState.PHASE3_CONFIRMED]: 'Phase 3: Confirming',
      [ConversionState.IN_PROGRESS]: 'Processing',
      [ConversionState.CONFIRMED]: 'Confirmed',
      [ConversionState.COMPLETED]: 'Completed',
      [ConversionState.FAILED]: 'Failed'
    };

    return phaseNames[this.currentState] || 'Unknown';
  }

  /**
   * Calculate estimated completion time based on current state
   */
  getEstimatedCompletion(): number | null {
    if (this.isTerminal()) {
      return null;
    }

    // Average time per phase in seconds
    const phaseDurations: Record<ConversionState, number> = {
      [ConversionState.PENDING]: 10,
      [ConversionState.RATE_LOCKED]: 5,
      [ConversionState.PHASE1_PREPARED]: 60,
      [ConversionState.PHASE2_COMMITTED]: 120,
      [ConversionState.PHASE3_CONFIRMED]: 180,
      [ConversionState.IN_PROGRESS]: 60,
      [ConversionState.CONFIRMED]: 30,
      [ConversionState.COMPLETED]: 0,
      [ConversionState.FAILED]: 0
    };

    let remainingTime = 0;
    let currentFound = false;

    for (const [state, duration] of Object.entries(phaseDurations)) {
      if (currentFound) {
        remainingTime += duration;
      }
      if (state === this.currentState) {
        currentFound = true;
        remainingTime += duration;
      }
    }

    return Date.now() + (remainingTime * 1000);
  }
}
