import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, DollarSign, Clock, Shield } from 'lucide-react';

const benefits = [
  {
    icon: DollarSign,
    title: 'Earn on your schedule',
    description: 'Drive when you want—evenings, weekends, or full-time.',
  },
  {
    icon: Clock,
    title: 'Set your own hours',
    description: 'You decide when and how long you drive.',
  },
  {
    icon: Shield,
    title: 'Get support every step',
    description: '24/7 support for drivers on the road.',
  },
];

const DriveSection = () => {
  return (
    <section id="drive" className="bg-primary text-primary-foreground py-16 lg:py-24">
      <div className="koloi-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div>
            <h2 className="text-3xl lg:text-4xl font-bold mb-6 leading-tight">
              Drive when you want, earn what you need
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 leading-relaxed">
              Join thousands of drivers earning on their own terms. Whether you need extra income or want to make driving your career, Koloi has you covered.
            </p>

            <div className="space-y-6 mb-8">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="flex gap-4">
                  <div className="w-10 h-10 bg-primary-foreground/10 rounded-lg flex items-center justify-center shrink-0">
                    <benefit.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{benefit.title}</h4>
                    <p className="text-primary-foreground/70 text-sm">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 h-14 px-8 font-semibold">
                <Link to="/drive">
                  Sign up to drive
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button 
                variant="outline" 
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 h-14 px-8"
              >
                Learn more
              </Button>
            </div>
          </div>

          {/* Right Stats */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-primary-foreground/10 rounded-xl p-6 text-center">
              <div className="text-4xl lg:text-5xl font-bold mb-2">10K+</div>
              <div className="text-primary-foreground/70 text-sm">Active drivers</div>
            </div>
            <div className="bg-primary-foreground/10 rounded-xl p-6 text-center">
              <div className="text-4xl lg:text-5xl font-bold mb-2">50K+</div>
              <div className="text-primary-foreground/70 text-sm">Trips completed</div>
            </div>
            <div className="bg-primary-foreground/10 rounded-xl p-6 text-center">
              <div className="text-4xl lg:text-5xl font-bold mb-2">4.9</div>
              <div className="text-primary-foreground/70 text-sm">Average rating</div>
            </div>
            <div className="bg-primary-foreground/10 rounded-xl p-6 text-center">
              <div className="text-4xl lg:text-5xl font-bold mb-2">24/7</div>
              <div className="text-primary-foreground/70 text-sm">Driver support</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DriveSection;
