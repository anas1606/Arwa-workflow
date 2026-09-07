import React from "react";
import clsx from "clsx";
import Link from "next/link";

const Button = ({
    children,
    onClick,
    type = "button",
    variant = "primary",
    size = "md",
    text = "",
    icon: Icon,
    iconPosition = "left",
    className = "",
    disabled = false,
    href = "",
    ...props
}) => {
    const baseStyle =
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50";

    const sizes = {
        sm: "min-h-10 px-3 py-1.5 text-xs",
        md: "min-h-11 px-3.5 text-sm sm:min-h-10",
        square: "h-11 w-11 min-w-0 p-2 sm:h-10 sm:w-10"
    };

    const variants = {
        primary: "bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary-dark",
        secondary: "border border-grey-icon/28 text-grey-text-dark hover:bg-white/85 bg-white/62 backdrop-blur-md backdrop-saturate-150 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-white)_85%,transparent)]",
        ghost: "text-grey-text-light hover:bg-white/55 hover:text-grey-text-strong",
        danger: "bg-danger-main text-white hover:bg-danger-dark shadow-md shadow-danger-main/20",
    };

    const iconSize = size === "sm" || size === "square" ? 14 : 18;

    const content = (
        <>
            {Icon && iconPosition === "left" && (
                typeof Icon === "function" ? Icon({ size: iconSize }) : <Icon size={iconSize} />
            )}
            {(children || text) && <span className="leading-none">{children || text}</span>}
            {Icon && iconPosition === "right" && (
                typeof Icon === "function" ? Icon({ size: iconSize }) : <Icon size={iconSize} />
            )}
        </>
    );

    const commonClasses = clsx(baseStyle, variants[variant], sizes[size], className);

    if (href) {
        return (
            <Link href={href} className={commonClasses} {...props}>
                {content}
            </Link>
        );
    }

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={commonClasses}
            {...props}
        >
            {content}
        </button>
    );
};

export default Button;
