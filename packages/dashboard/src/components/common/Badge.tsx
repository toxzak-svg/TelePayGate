import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface BadgeProps {
    children: ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple';
    size?: 'sm' | 'md' | 'lg';
    icon?: LucideIcon;
    pill?: boolean;
    className?: string;
}

export default function Badge({
    children,
    variant = 'default',
    size = 'md',
    icon: Icon,
    pill = false,
    className = '',
}: BadgeProps) {
    const baseStyles = 'inline-flex items-center gap-1.5 font-medium transition-smooth';

    const variantStyles = {
        default: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
        success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
        warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
        error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
        purple: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400',
    };

    const sizeStyles = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base',
    };

    const shapeStyle = pill ? 'rounded-full' : 'rounded-md';

    const iconSizes = {
        sm: 'h-3 w-3',
        md: 'h-3.5 w-3.5',
        lg: 'h-4 w-4',
    };

    return (
        <span className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${shapeStyle} ${className}`}>
            {Icon && <Icon className={iconSizes[size]} />}
            {children}
        </span>
    );
}
