import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface CardProps {
    children: ReactNode;
    className?: string;
    variant?: 'default' | 'glass' | 'gradient' | 'hover-lift';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    onClick?: () => void;
}

export default function Card({
    children,
    className = '',
    variant = 'default',
    padding = 'md',
    onClick
}: CardProps) {
    const baseStyles = 'rounded-xl transition-smooth';

    const variantStyles = {
        default: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-md',
        glass: 'glass shadow-glass',
        gradient: 'bg-gradient-to-br from-primary-500/10 to-secondary-500/10 border border-white/10',
        'hover-lift': 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-md hover-lift hover:shadow-xl',
    };

    const paddingStyles = {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    };

    const cursorStyle = onClick ? 'cursor-pointer' : '';

    return (
        <div
            className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${cursorStyle} ${className}`}
            onClick={onClick}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    action?: ReactNode;
    className?: string;
}

export function CardHeader({ title, subtitle, icon: Icon, action, className = '' }: CardHeaderProps) {
    return (
        <div className={`flex items-start justify-between mb-4 ${className}`}>
            <div className="flex items-start gap-3">
                {Icon && (
                    <div className="p-2 bg-primary-500/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary-500" />
                    </div>
                )}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                    {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
                </div>
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}

interface CardBodyProps {
    children: ReactNode;
    className?: string;
}

export function CardBody({ children, className = '' }: CardBodyProps) {
    return <div className={className}>{children}</div>;
}

interface CardFooterProps {
    children: ReactNode;
    className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
    return (
        <div className={`mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 ${className}`}>
            {children}
        </div>
    );
}
