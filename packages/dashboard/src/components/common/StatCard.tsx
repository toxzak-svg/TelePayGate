import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    icon: LucideIcon;
    trend?: 'up' | 'down' | 'neutral';
    loading?: boolean;
    gradient?: boolean;
    className?: string;
}

export default function StatCard({
    title,
    value,
    change,
    changeLabel,
    icon: Icon,
    trend = 'neutral',
    loading = false,
    gradient = false,
    className = '',
}: StatCardProps) {
    const [animatedValue, setAnimatedValue] = useState(0);
    const numericValue = typeof value === 'number' ? value : parseFloat(value.toString().replace(/[^0-9.-]+/g, ''));

    useEffect(() => {
        if (!loading && typeof value === 'number') {
            const duration = 1000;
            const steps = 60;
            const increment = value / steps;
            let current = 0;

            const timer = setInterval(() => {
                current += increment;
                if (current >= value) {
                    setAnimatedValue(value);
                    clearInterval(timer);
                } else {
                    setAnimatedValue(Math.floor(current));
                }
            }, duration / steps);

            return () => clearInterval(timer);
        }
    }, [value, loading]);

    const trendColor = trend === 'up' ? 'text-green-600 dark:text-green-400' :
        trend === 'down' ? 'text-red-600 dark:text-red-400' :
            'text-gray-600 dark:text-gray-400';

    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;

    const cardStyle = gradient
        ? 'bg-gradient-to-br from-primary-500/10 via-secondary-500/10 to-transparent border border-primary-500/20'
        : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800';

    return (
        <div className={`rounded-xl p-6 shadow-lg hover:shadow-xl transition-smooth hover-lift ${cardStyle} ${className}`}>
            <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl shadow-lg">
                    <Icon className="h-6 w-6 text-white" />
                </div>
                {change !== undefined && (
                    <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
                        {TrendIcon && <TrendIcon className="h-4 w-4" />}
                        <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{title}</h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {loading ? (
                        <span className="inline-block h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    ) : typeof value === 'number' ? (
                        animatedValue.toLocaleString()
                    ) : (
                        value
                    )}
                </p>
                {changeLabel && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{changeLabel}</p>
                )}
            </div>
        </div>
    );
}
