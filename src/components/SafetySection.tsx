import { Shield, Phone, MapPin, Users } from 'lucide-react';

const safetyFeatures = [
  {
    icon: Shield,
    title: 'Safety features built in',
    description: 'Share your trip status with loved ones and access emergency assistance.',
  },
  {
    icon: Phone,
    title: '24/7 support',
    description: 'Our support team is available around the clock to help.',
  },
  {
    icon: MapPin,
    title: 'Real-time tracking',
    description: 'Track your ride in real-time from request to drop-off.',
  },
  {
    icon: Users,
    title: 'Verified drivers',
    description: 'All drivers undergo thorough background checks.',
  },
];

const SafetySection = () => {
  return (
    <section className="bg-koloi-gray-100 py-16 lg:py-24">
      <div className="koloi-container">
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Your safety drives us
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Whether you're riding or driving, we're committed to your safety. Every trip is tracked and our support team is always ready to help.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {safetyFeatures.map((feature) => (
            <div
              key={feature.title}
              className="bg-card rounded-xl p-6 shadow-koloi-sm hover:shadow-koloi-md transition-shadow"
            >
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SafetySection;
