import { MapPin, DollarSign, Car } from 'lucide-react';

const steps = [
  {
    icon: MapPin,
    iconBg: 'bg-accent',
    title: 'Set your trip',
    features: [
      { title: 'East your lick', description: 'Hain get murnecs destination eith oy herpius.' },
      { title: 'Plan-cutbace tip', description: 'Your rerifion covries location broging situts.' },
      { title: 'Trip sharing & safety', description: 'Scary for drieurs ait rernutes-fores and drive It ips.' },
    ],
  },
  {
    icon: DollarSign,
    iconBg: 'bg-koloi-navy',
    title: 'Offer your price',
    features: [
      { title: 'Nearby drivers', description: 'Erem pouris taiol:-z offer altuge bleation prier antantes.' },
      { title: 'Quick pickup', description: 'Ionea eriver get your pfcw/ ene ca petiabis.' },
      { title: 'Trip sharing & safety', description: 'Beunna tiperetauns to fre-frmm your trip-priver loscarts.' },
    ],
  },
  {
    icon: Car,
    iconBg: 'bg-koloi-navy',
    title: 'Get matched',
    features: [
      { title: 'Visk your driver', description: 'You ment price mader your pernail betched bs centday summors.' },
      { title: 'Drive & magically', description: 'You arebable sholian aboceans give you spenal beep pures.' },
      { title: 'Earry Nelp-meal', description: 'Ratthen gu cutbancs breping, keep inodat seward pist. you.' },
    ],
  },
];

const HowItWorksSection = () => {
  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="koloi-container">
        <h2 className="text-3xl lg:text-4xl font-display font-bold text-foreground text-center mb-12 lg:mb-16">
          How It Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={step.title} className="bg-card rounded-2xl p-6 shadow-koloi-sm border border-border">
              {/* Icon and Title */}
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 ${step.iconBg} rounded-lg flex items-center justify-center`}>
                  <step.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-display font-semibold text-foreground">
                  {step.title}
                </h3>
              </div>

              {/* Features List */}
              <div className="space-y-4">
                {step.features.map((feature) => (
                  <div key={feature.title}>
                    <div className="flex items-start gap-2">
                      <span className="text-accent font-bold mt-0.5">→</span>
                      <div>
                        <h4 className="font-semibold text-foreground text-sm">
                          {feature.title}
                        </h4>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
