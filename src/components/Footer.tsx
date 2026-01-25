import { Facebook, Twitter, Instagram, Linkedin, Globe } from 'lucide-react';
import KoloiLogo from '@/components/KoloiLogo';

const footerLinks = {
  company: [
    { label: 'About us', href: '#about' },
    { label: 'Our offerings', href: '#' },
    { label: 'Newsroom', href: '#' },
    { label: 'Investors', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
  ],
  products: [
    { label: 'Ride', href: '#ride' },
    { label: 'Drive', href: '#drive' },
    { label: 'Business', href: '#business' },
    { label: 'Koloi Eats', href: '#' },
    { label: 'Koloi Freight', href: '#' },
  ],
  citizenship: [
    { label: 'Safety', href: '#' },
    { label: 'Diversity', href: '#' },
    { label: 'Sustainability', href: '#' },
  ],
  travel: [
    { label: 'Airports', href: '#' },
    { label: 'Cities', href: '#' },
  ],
};

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
];

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="koloi-container py-12 lg:py-16">
        {/* Top Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {/* Logo Column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
            <a href="/" className="inline-block">
              <KoloiLogo variant="inverted" showTagline />
            </a>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-semibold mb-4">Products</h4>
            <ul className="space-y-3">
              {footerLinks.products.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Citizenship */}
          <div>
            <h4 className="font-semibold mb-4">Citizenship</h4>
            <ul className="space-y-3">
              {footerLinks.citizenship.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Travel */}
          <div>
            <h4 className="font-semibold mb-4">Travel</h4>
            <ul className="space-y-3">
              {footerLinks.travel.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-primary-foreground/20 pt-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Social Links */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 bg-primary-foreground/10 rounded-full flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>

            {/* Language Selector */}
            <button className="flex items-center gap-2 text-sm hover:text-primary-foreground/80 transition-colors">
              <Globe className="w-4 h-4" />
              <span>English</span>
            </button>
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap gap-4 mt-8 text-sm text-primary-foreground/60">
            <span>© 2025 Koloi Technologies Inc.</span>
            <a href="#" className="hover:text-primary-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-primary-foreground transition-colors">
              Accessibility
            </a>
            <a href="#" className="hover:text-primary-foreground transition-colors">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
