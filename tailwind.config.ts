import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				/* Syncrasis Vibrant Colors */
				sunset: {
					glow: 'hsl(var(--sunset-glow))',
					deep: 'hsl(var(--sunset-deep))'
				},
				twilight: {
					purple: 'hsl(var(--twilight-purple))',
					pink: 'hsl(var(--twilight-pink))'
				},
				cobalt: {
					deep: 'hsl(var(--cobalt-deep))',
					mid: 'hsl(var(--cobalt-mid))',
					light: 'hsl(var(--cobalt-light))'
				},
				cyan: {
					bright: 'hsl(var(--cyan-bright))'
				},
				teal: {
					vibrant: 'hsl(var(--teal-vibrant))'
				},
				// Electric LED colors
				electric: {
					green: 'hsl(var(--electric-green))',
					blue: 'hsl(var(--electric-blue))',
					purple: 'hsl(var(--electric-purple))',
					red: 'hsl(var(--electric-red))',
					yellow: 'hsl(var(--electric-yellow))'
				},
				// Desert Sage & Orange Theme
				sage: {
					glow: 'hsl(var(--sage-glow))',
					bright: 'hsl(var(--sage-bright))',
					deep: 'hsl(var(--sage-deep))'
				},
				orange: {
					bright: 'hsl(var(--orange-bright))',
					glow: 'hsl(var(--orange-glow))',
					deep: 'hsl(var(--orange-deep))'
				}
			},
			fontFamily: {
				'montserrat': ['Montserrat', 'sans-serif'],
				'sans': ['Montserrat', 'ui-sans-serif', 'system-ui'],
				'mono': ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
				'display': ['Orbitron', 'Montserrat', 'sans-serif'], // For futuristic headings
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				'xl': '1rem',
				'2xl': '1.5rem',
				'3xl': '2rem'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'sunset-pulse': {
					'0%, 100%': {
						boxShadow: '0 0 30px hsl(var(--sunset-glow) / 0.3)'
					},
					'50%': {
						boxShadow: '0 0 50px hsl(var(--sunset-glow) / 0.6), 0 0 80px hsl(var(--twilight-pink) / 0.3)'
					}
				},
				'float': {
					'0%, 100%': {
						transform: 'translateY(0px)'
					},
					'50%': {
						transform: 'translateY(-10px)'
					}
				},
				'glow-rotate': {
					'0%': {
						transform: 'rotate(0deg)',
						filter: 'hue-rotate(0deg)'
					},
					'100%': {
						transform: 'rotate(360deg)',
						filter: 'hue-rotate(360deg)'
					}
				},
				'slide-up': {
					'0%': {
						transform: 'translateY(20px)',
						opacity: '0'
					},
					'100%': {
						transform: 'translateY(0)',
						opacity: '1'
					}
				},
				'led-flow-horizontal': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(100vw)' }
				},
				'led-flow-vertical': {
					'0%': { transform: 'translateY(-100%)' },
					'100%': { transform: 'translateY(100vh)' }
				},
				'led-flow-diagonal': {
					'0%': { transform: 'translate(-100%, -100%)' },
					'100%': { transform: 'translate(100vw, 100vh)' }
				},
				'color-shift': {
					'0%': { filter: 'hue-rotate(0deg)' },
					'25%': { filter: 'hue-rotate(90deg)' },
					'50%': { filter: 'hue-rotate(180deg)' },
					'75%': { filter: 'hue-rotate(270deg)' },
					'100%': { filter: 'hue-rotate(360deg)' }
				},
				'rave-flash': {
					'0%': { opacity: '1' },
					'25%': { opacity: '0.4' },
					'50%': { opacity: '1' },
					'75%': { opacity: '0.6' },
					'100%': { opacity: '1' }
				},
				'laser-strobe': {
					'0%': { transform: 'scale(1)', filter: 'brightness(1) saturate(1)' },
					'25%': { transform: 'scale(1.05)', filter: 'brightness(1.5) saturate(2)' },
					'50%': { transform: 'scale(1)', filter: 'brightness(2) saturate(3)' },
					'75%': { transform: 'scale(1.02)', filter: 'brightness(1.8) saturate(2.5)' },
					'100%': { transform: 'scale(1)', filter: 'brightness(1) saturate(1)' }
				},
				'laser-beam-1': {
					'0%': { transform: 'translateY(-50%) rotate(0deg) scaleX(0)', opacity: '0' },
					'50%': { transform: 'translateY(-50%) rotate(0deg) scaleX(1)', opacity: '1' },
					'100%': { transform: 'translateY(-50%) rotate(45deg) scaleX(1)', opacity: '0.9' }
				},
				'laser-beam-2': {
					'0%': { transform: 'translateY(-50%) rotate(45deg) scaleX(0)', opacity: '0' },
					'50%': { transform: 'translateY(-50%) rotate(45deg) scaleX(1)', opacity: '1' },
					'100%': { transform: 'translateY(-50%) rotate(90deg) scaleX(1)', opacity: '0.85' }
				},
				'laser-beam-3': {
					'0%': { transform: 'translateY(-50%) rotate(90deg) scaleX(0)', opacity: '0' },
					'50%': { transform: 'translateY(-50%) rotate(90deg) scaleX(1)', opacity: '1' },
					'100%': { transform: 'translateY(-50%) rotate(135deg) scaleX(1)', opacity: '0.8' }
				},
				'laser-beam-4': {
					'0%': { transform: 'translateY(-50%) rotate(135deg) scaleX(0)', opacity: '0' },
					'50%': { transform: 'translateY(-50%) rotate(135deg) scaleX(1)', opacity: '1' },
					'100%': { transform: 'translateY(-50%) rotate(180deg) scaleX(1)', opacity: '0.75' }
				},
				'laser-beam-5': {
					'0%': { transform: 'translateY(-50%) rotate(180deg) scaleX(0)', opacity: '0' },
					'50%': { transform: 'translateY(-50%) rotate(180deg) scaleX(1)', opacity: '1' },
					'100%': { transform: 'translateY(-50%) rotate(225deg) scaleX(1)', opacity: '0.85' }
				},
				'laser-beam-6': {
					'0%': { transform: 'translateY(-50%) rotate(225deg) scaleX(0)', opacity: '0' },
					'50%': { transform: 'translateY(-50%) rotate(225deg) scaleX(1)', opacity: '1' },
					'100%': { transform: 'translateY(-50%) rotate(270deg) scaleX(1)', opacity: '0.8' }
				},
				'laser-beam-7': {
					'0%': { transform: 'translateY(-50%) rotate(270deg) scaleX(0)', opacity: '0' },
					'50%': { transform: 'translateY(-50%) rotate(270deg) scaleX(1)', opacity: '1' },
					'100%': { transform: 'translateY(-50%) rotate(315deg) scaleX(1)', opacity: '0.9' }
				},
				'laser-beam-8': {
					'0%': { transform: 'translateY(-50%) rotate(315deg) scaleX(0)', opacity: '0' },
					'50%': { transform: 'translateY(-50%) rotate(315deg) scaleX(1)', opacity: '1' },
					'100%': { transform: 'translateY(-50%) rotate(0deg) scaleX(1)', opacity: '0.75' }
				},
				// Modern UI keyframes
				'sage-glow': {
					'0%': { 
						boxShadow: '0 0 20px hsl(var(--sage-glow) / 0.3), 0 0 40px hsl(var(--sage-glow) / 0.1)',
						filter: 'brightness(1)'
					},
					'100%': { 
						boxShadow: '0 0 30px hsl(var(--sage-glow) / 0.6), 0 0 60px hsl(var(--sage-glow) / 0.3)',
						filter: 'brightness(1.1)'
					}
				},
				'orange-pulse': {
					'0%': { 
						boxShadow: '0 0 15px hsl(var(--orange-bright) / 0.4)',
						transform: 'scale(1)'
					},
					'50%': { 
						boxShadow: '0 0 25px hsl(var(--orange-glow) / 0.7), 0 0 40px hsl(var(--orange-bright) / 0.3)',
						transform: 'scale(1.02)'
					},
					'100%': { 
						boxShadow: '0 0 15px hsl(var(--orange-bright) / 0.4)',
						transform: 'scale(1)'
					}
				},
				'modern-float': {
					'0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
					'25%': { transform: 'translateY(-5px) rotate(0.5deg)' },
					'50%': { transform: 'translateY(-8px) rotate(0deg)' },
					'75%': { transform: 'translateY(-3px) rotate(-0.5deg)' }
				},
				'text-glow': {
					'0%': { 
						textShadow: '0 0 10px hsl(var(--sage-bright) / 0.5)',
						filter: 'brightness(1)'
					},
					'100%': { 
						textShadow: '0 0 20px hsl(var(--sage-glow) / 0.8), 0 0 30px hsl(var(--sage-bright) / 0.4)',
						filter: 'brightness(1.1)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'sunset-pulse': 'sunset-pulse 3s ease-in-out infinite',
				'float': 'float 3s ease-in-out infinite',
				'glow-rotate': 'glow-rotate 8s linear infinite',
				'slide-up': 'slide-up 0.6s ease-out',
				'led-flow-h1': 'led-flow-horizontal 3s linear infinite',
				'led-flow-h2': 'led-flow-horizontal 4s linear infinite reverse',
				'led-flow-v1': 'led-flow-vertical 2.5s linear infinite',
				'led-flow-v2': 'led-flow-vertical 3.5s linear infinite reverse',
				'led-flow-d1': 'led-flow-diagonal 5s linear infinite',
				'led-flow-d2': 'led-flow-diagonal 6s linear infinite reverse',
				'color-shift': 'color-shift 8s ease-in-out infinite',
				'rave-flash': 'rave-flash 0.8s ease-in-out infinite',
				'laser-strobe': 'laser-strobe 1.2s ease-in-out infinite',
				'laser-beam-1': 'laser-beam-1 2s ease-in-out infinite',
				'laser-beam-2': 'laser-beam-2 2.2s ease-in-out infinite',
				'laser-beam-3': 'laser-beam-3 1.8s ease-in-out infinite',
				'laser-beam-4': 'laser-beam-4 2.4s ease-in-out infinite',
				'laser-beam-5': 'laser-beam-5 2.1s ease-in-out infinite',
				'laser-beam-6': 'laser-beam-6 1.9s ease-in-out infinite',
				'laser-beam-7': 'laser-beam-7 2.3s ease-in-out infinite',
				'laser-beam-8': 'laser-beam-8 2.0s ease-in-out infinite',
				// Modern UI animations
				'sage-glow': 'sage-glow 2s ease-in-out infinite alternate',
				'orange-pulse': 'orange-pulse 1.5s ease-in-out infinite',
				'modern-float': 'modern-float 4s ease-in-out infinite',
				'text-glow': 'text-glow 3s ease-in-out infinite alternate'
			},
			backgroundImage: {
				'gradient-sunset': 'var(--gradient-sunset)',
				'gradient-twilight': 'var(--gradient-twilight)',
				'gradient-glow': 'var(--gradient-glow)',
				'gradient-vibrant': 'var(--gradient-vibrant)',
				'gradient-card': 'var(--gradient-card)'
			},
			boxShadow: {
				'glow': 'var(--shadow-glow)',
				'purple': 'var(--shadow-purple)',
				'cyan': 'var(--shadow-cyan)',
				'deep': 'var(--shadow-deep)',
				'card': 'var(--shadow-card)'
			},
			backdropFilter: {
				'glass': 'var(--glass-backdrop)'
			},
			textShadow: {
				'bubble': 'var(--text-shadow-bubble)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
