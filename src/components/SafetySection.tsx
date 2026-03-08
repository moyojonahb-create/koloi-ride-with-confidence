import { Shield, Phone, MapPin, Users, CheckCircle2 } from 'lucide-react';

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
    <section className="bg-voyex-gray-100 py-20 lg:py-28">
      <div className="voyex-container">
        <div className="text-center mb-14 lg:mb-18">
          <div className="voyex-badge justify-center mx-auto mb-6">
            <CheckCircle2 className="w-4 h-4" />
            Your Safety Matters
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-5 tracking-tight">
            Your safety drives us
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Whether you're riding or driving, we're committed to your safety. Every trip is tracked and our support team is always ready to help.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {safetyFeatures.map((feature, index) => (
            <div
              key={feature.title}
              className="voyex-feature-card group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="voyex-icon-box bg-accent/10 text-accent mb-5 group-hover:bg-accent group-hover:text-accent-foreground transition-all duration-300">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
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