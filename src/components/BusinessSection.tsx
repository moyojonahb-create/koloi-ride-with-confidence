import { Button } from '@/components/ui/button';
import { ArrowRight, Building2, Receipt, Users2, TrendingDown } from 'lucide-react';
const features = [{
  icon: Building2,
  title: 'Central billing',
  description: 'Manage all employee rides from one dashboard with detailed reporting.'
}, {
  icon: Receipt,
  title: 'Expense tracking',
  description: 'Automatic receipt generation and expense categorization.'
}, {
  icon: Users2,
  title: 'Team management',
  description: 'Add employees, set policies, and control spending limits.'
}];
const BusinessSection = () => {
  return <section id="business" className="bg-background py-20 lg:py-28">
      <div className="koloi-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div>
            <div className="koloi-badge mb-6">
              <Building2 className="w-4 h-4" />
              Voyex for Business
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight tracking-tight">
              Transform how your company moves
            </h2>
            <p className="text-muted-foreground text-lg mb-10 leading-relaxed max-w-lg">
              Give your team the flexibility to travel on their terms while keeping complete control over costs. From startups to enterprises, PickMe Business scales with you.
            </p>

            <div className="space-y-5 mb-10">
              {features.map(feature => <div key={feature.title} className="flex gap-4 items-start">
                  <div className="koloi-icon-box bg-secondary text-foreground shrink-0">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1 text-lg">{feature.title}</h4>
                    <p className="text-muted-foreground text-sm">
                      {feature.description}
                    </p>
                  </div>
                </div>)}
            </div>

            <Button variant="accent" size="lg">
              Get started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Right Visual - Dashboard mockup */}
          <div className="bg-koloi-gray-100 rounded-3xl p-8 lg:p-10">
            {/* Main stat card */}
            <div className="bg-card rounded-2xl shadow-koloi-md p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground font-medium">This month</span>
                <span className="koloi-badge text-xs py-1">
                  <TrendingDown className="w-3 h-3" />
                  12% vs last month
                </span>
              </div>
              <div className="text-4xl font-bold text-foreground mb-1">
              <span className="text-xl text-muted-foreground">.00</span></div>
              <div className="text-sm text-muted-foreground">Total spending</div>
            </div>

            {/* Smaller stat cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="koloi-feature-card">
                <div className="text-3xl font-bold text-foreground mb-1">156</div>
                <div className="text-xs text-muted-foreground">Total trips</div>
              </div>
              <div className="koloi-feature-card">
                <div className="text-3xl font-bold text-foreground mb-1">24</div>
                <div className="text-xs text-muted-foreground">Active users</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default BusinessSection;