# ProMovie visual direction

## Product intent

ProMovie should feel like a premium, private streaming club rather than a generic media catalog. The platform opens with a decisive red-on-black identity, protects all content behind access control, and looks intentionally complete even when the content database is empty.

## Three design approaches considered

| Direction | Description | Decision |
|---|---|---|
| Neon cinema | Heavy crimson lighting, glossy poster-wall energy, animated light leaks. | Too dependent on posters and imagery for an intentionally empty launch. |
| Luxury private screening | Matte black canvas, precise red accents, warm gold wallet details, large typography, fine film-grain texture. | Selected because it stays premium with zero uploaded movies. |
| Minimal utility dashboard | Grey panels, dense tables, technical controls. | Suitable for internal administration but too cold for the member-facing experience. |

## Chosen system

The user-facing experience uses black `#0A0A0A`, ProMovie red `#E50914`, warm gold `#FFC107`, low-contrast charcoal surfaces, a bold wordmark, and restrained motion. Empty states use original abstract brand art rather than posters, actors, movie scenes, or placeholder films. The admin experience inherits the same palette but uses denser data layouts for faster management.

## Screen architecture

The public flow contains `/login`, `/signup`, and `/verify-otp`, while protected member views include `/`, `/profile`, `/watch/:id`, and `/downloads`. Administration lives under `/admin` with category, movie, user, and analytics views. Every initial collection is deliberately empty and explains the next real action rather than fabricating content.
