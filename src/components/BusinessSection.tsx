import { Button } from '@/components/ui/button';
import { ArrowRight, Building2, Receipt, Users2 } from 'lucide-react';

const features = [
  {
    icon: Building2,
    title: 'Central billing',
    description: 'Manage all employee rides from one dashboard with detailed reporting.',
  },
  {
    icon: Receipt,
    title: 'Expense tracking',
    description: 'Automatic receipt generation and expense categorization.',
  },
  {
    icon: Users2,
    title: 'Team management',
    description: 'Add employees, set policies, and control spending limits.',
  },
];

const BusinessSection = () => {
  return (
    <section id="business" className="bg-background py-16 lg:py-24">
      <div className="koloi-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium mb-4">
              <Building2 className="w-4 h-4" />
              Koloi for Business
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6 leading-tight">
              Transform how your company moves
            </h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Give your team the flexibility to travel on their terms while keeping complete control over costs. From startups to enterprises, Koloi Business scales with you.
            </p>

            <div className="space-y-6 mb-8">
              {features.map((feature) => (
                <div key={feature.title} className="flex gap-4">
                  <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">{feature.title}</h4>
                    <p className="text-muted-foreground text-sm">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button className="koloi-btn-primary">
              Get started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Right Visual */}
          <div className="bg-koloi-gray-100 rounded-2xl p-8 lg:p-12">
            <div className="bg-card rounded-xl shadow-koloi-md p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">This month</span>
                <span className="text-xs text-accent font-medium">↓ 12% vs last month</span>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">$4,280.00</div>
              <div className="text-sm text-muted-foreground">Total spending</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card rounded-xl shadow-koloi-sm p-4">
                <div className="text-2xl font-bold text-foreground mb-1">156</div>
                <div className="text-xs text-muted-foreground">Total trips</div>
              </div>
              <div className="bg-card rounded-xl shadow-koloi-sm p-4">
                <div className="text-2xl font-bold text-foreground mb-1">24</div>
                <div className="text-xs text-muted-foreground">Active users</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BusinessSection;
