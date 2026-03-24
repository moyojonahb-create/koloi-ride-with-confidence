import { Car, Wallet, Briefcase, ArrowUpRight } from 'lucide-react';

const suggestions = [
  {
    id: 'ride',
    icon: Car,
    title: 'Ride',
    description: 'Go anywhere with PickMe. Request a ride, hop in, and go.',
    href: '#ride',
  },
  {
    id: 'drive',
    icon: Wallet,
    title: 'Drive',
    description: 'Make money on your schedule. Drive when you want, earn what you need.',
    href: '#drive',
  },
  {
    id: 'business',
    icon: Briefcase,
    title: 'PickMe for Business',
    description: 'Transform the way your company moves and feeds its people.',
    href: '#business',
  },
];

const SuggestionsSection = () => {
  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="pickme-container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {suggestions.map((item, index) => (
            <a
              key={item.id}
              href={item.href}
              className="group relative block p-8 bg-pickme-gray-100 rounded-3xl hover:bg-pickme-gray-200 transition-all duration-300 hover:shadow-pickme-lg hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Arrow indicator */}
              <div className="absolute top-6 right-6 w-10 h-10 bg-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
                <ArrowUpRight className="w-5 h-5 text-foreground" />
              </div>

              <div className="pickme-icon-box bg-background mb-5 group-hover:bg-accent/10 group-hover:text-accent">
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                {item.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {item.description}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SuggestionsSection;