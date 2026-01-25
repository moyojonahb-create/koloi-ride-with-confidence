import { Shield, Share2, AlertTriangle } from 'lucide-react';

const safetyFeatures = [
  {
    icon: Shield,
    title: 'Verified drivers',
    description: 'Get out employeee from directions to enoure the local pidway.',
  },
  {
    icon: Share2,
    title: 'Share trip link',
    description: 'Reless can clase from line & reserves cnantle semeations to-completed.',
  },
  {
    icon: AlertTriangle,
    badge: 'SOS',
    title: 'SOS button',
    description: 'Ibsitte aeriadiy, Impo vien-colstenses, progred a celeipticentille heaspes.',
  },
];

const SafetySection = () => {
  return (
    <section className="bg-primary py-16 lg:py-24">
      <div className="koloi-container">
        <h2 className="text-3xl lg:text-4xl font-display font-bold text-primary-foreground text-center mb-12 lg:mb-16 italic">
          Safety after you...
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {safetyFeatures.map((feature) => (
            <div
              key={feature.title}
              className="bg-card rounded-2xl p-6 shadow-koloi-md"
            >
              {/* Icon */}
              <div className="flex items-center gap-3 mb-4">
                {feature.badge ? (
                  <div className="px-3 py-1 bg-accent text-accent-foreground text-xs font-bold rounded">
                    {feature.badge}
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                )}
                <h3 className="text-lg font-display font-semibold text-foreground">
                  {feature.title}
                </h3>
              </div>
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
