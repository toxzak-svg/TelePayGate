import { ReactNode } from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

interface ButtonProps {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg';
    icon?: LucideIcon;
    iconPosition?: 'left' | 'right';
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    className?: string;
}

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconPosition = 'left',
    loading = false,
    disabled = false,
    fullWidth = false,
    onClick,
    type = 'button',
    className = '',
}: ButtonProps) {
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
        primary: 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white hover:from-primary-700 hover:to-secondary-700 focus:ring-primary-500 shadow-md hover:shadow-lg',
        secondary: 'bg-accent-600 text-white hover:bg-accent-700 focus:ring-accent-500 shadow-md hover:shadow-lg',
        ghost: 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-md hover:shadow-lg',
        success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-md hover:shadow-lg',
    };

    const sizeStyles = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    const widthStyle = fullWidth ? 'w-full' : '';

    const isDisabled = disabled || loading;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isDisabled}
            className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
        >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {!loading && Icon && iconPosition === 'left' && <Icon className="h-4 w-4" />}
            <span>{children}</span>
            {!loading && Icon && iconPosition === 'right' && <Icon className="h-4 w-4" />}
        </button>
    );
}
