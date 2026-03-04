import { Facebook, Twitter, Instagram, Linkedin, Globe, Mail, Phone, MapPin } from 'lucide-react';
import PickMeLogo from '@/components/PickMeLogo';

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
      <div className="koloi-container py-14 lg:py-20">
        {/* Top Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-14">
          {/* Logo Column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
            <a href="/" className="inline-block">
              <PickMeLogo variant="inverted" showTagline />
            </a>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-bold mb-5">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-bold mb-5">Products</h4>
            <ul className="space-y-3">
              {footerLinks.products.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Citizenship */}
          <div>
            <h4 className="font-bold mb-5">Citizenship</h4>
            <ul className="space-y-3">
              {footerLinks.citizenship.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Travel */}
          <div>
            <h4 className="font-bold mb-5">Travel</h4>
            <ul className="space-y-3">
              {footerLinks.travel.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-primary-foreground/20 pt-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-11 h-11 bg-primary-foreground/10 rounded-full flex items-center justify-center hover:bg-primary-foreground/20 transition-all duration-200 hover:scale-105"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>

            {/* Language Selector */}
            <button className="flex items-center gap-2 text-sm font-medium hover:text-primary-foreground/80 transition-colors px-4 py-2 rounded-full hover:bg-primary-foreground/10">
              <Globe className="w-4 h-4" />
              <span>English</span>
            </button>
          </div>

          {/* Legal Links */}
          <div className="flex flex-col gap-6 mt-10">
            {/* Contact Info */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-primary-foreground/80">
              <a href="mailto:moyojonahb@gmail.com" className="flex items-center gap-2 hover:text-primary-foreground transition-colors">
                <Mail className="w-4 h-4" />
                moyojonahb@gmail.com
              </a>
              <a href="tel:+263778553169" className="flex items-center gap-2 hover:text-primary-foreground transition-colors">
                <Phone className="w-4 h-4" />
                +263 778 553 169
              </a>
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Gwanda Town, Zimbabwe
              </span>
            </div>

            {/* Copyright & Legal */}
            <div className="flex flex-wrap gap-4 text-sm text-primary-foreground/60">
              <span>© 2026 Koloi. Powered by Tautona Tek</span>
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
      </div>
    </footer>
  );
};

export default Footer;
