import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, DollarSign, Clock, Shield, TrendingUp, Lightbulb } from 'lucide-react';
const benefits = [{
  icon: DollarSign,
  title: 'Earn on your schedule',
  description: 'Drive when you want—evenings, weekends, or full-time.'
}, {
  icon: Clock,
  title: 'Set your own hours',
  description: 'You decide when and how long you drive.'
}, {
  icon: Shield,
  title: 'Get support every step',
  description: '24/7 support for drivers on the road.'
}];
const stats = [{
  value: '10K+',
  label: 'Active drivers',
  icon: '🚗'
}, {
  value: '50K+',
  label: 'Trips completed',
  icon: '✓'
}, {
  value: '4.9',
  label: 'Average rating',
  icon: '⭐'
}, {
  value: '24/7',
  label: 'Driver support',
  icon: '📞'
}];
const DriveSection = () => {
  return <section id="drive" className="bg-primary text-primary-foreground py-20 lg:py-28">
      <div className="koloi-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div>
            <div className="koloi-badge bg-primary-foreground/10 text-primary-foreground mb-6">
              <TrendingUp className="w-4 h-4" />
              Start Earning
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight tracking-tight">
              Drive when you want, earn what you need
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-10 leading-relaxed max-w-lg">
              Join thousands of drivers earning on their own terms. Whether you need extra income or want to make driving your career, Voyex has you covered.
            </p>

            <div className="space-y-5 mb-10">
              {benefits.map(benefit => <div key={benefit.title} className="flex gap-4 items-start">
                  <div className="koloi-icon-box bg-primary-foreground/10 text-primary-foreground shrink-0">
                    <benefit.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1 text-lg">{benefit.title}</h4>
                    <p className="text-primary-foreground/70 text-sm">
                      {benefit.description}
                    </p>
                  </div>
                </div>)}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 h-14 px-8 font-bold">
                <Link to="/drive">
                  Sign up to drive
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent">
                Learn more
              </Button>
            </div>
          </div>

          {/* Right Stats Grid */}
          <div className="grid grid-cols-2 gap-5">
            {stats.map(stat => <div key={stat.label} className="koloi-stat-card">
                <div className="text-2xl mb-2">{stat.icon}</div>
                <div className="text-4xl lg:text-5xl font-bold mb-2">{stat.value}</div>
                <div className="text-primary-foreground/70 text-sm">{stat.label}</div>
              </div>)}
          </div>
        </div>
      </div>
    </section>;
};
export default DriveSection;