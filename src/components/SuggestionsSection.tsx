import { Car, Wallet, Briefcase } from 'lucide-react';

const suggestions = [
  {
    id: 'ride',
    icon: Car,
    title: 'Ride',
    description: 'Go anywhere with Koloi. Request a ride, hop in, and go.',
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
    title: 'Koloi for Business',
    description: 'Transform the way your company moves and feeds its people.',
    href: '#business',
  },
];

const SuggestionsSection = () => {
  return (
    <section className="bg-background py-12 lg:py-20">
      <div className="koloi-container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {suggestions.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className="group block p-6 bg-koloi-gray-100 rounded-xl hover:bg-koloi-gray-200 transition-all duration-300 hover:shadow-koloi-md"
            >
              <div className="w-12 h-12 bg-background rounded-lg flex items-center justify-center mb-4 group-hover:bg-koloi-gray-100 transition-colors">
                <item.icon className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:underline underline-offset-4">
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
