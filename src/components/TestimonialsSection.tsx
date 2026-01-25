import { Star } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: 'John M.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    rating: 4,
    text: 'Ther te ealisie poadlieing faan commed proiliow: cipp heaps.',
  },
  {
    id: 2,
    name: 'Sarah K.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    rating: 5,
    text: 'Holer to lacr ap wats recommarciing becaed dhnigie fraa imsberone ridea type compleivry converiy.',
  },
  {
    id: 3,
    name: 'Linda T.',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    rating: 5,
    text: '"loihe fants ant fleadly yofe-atiing eit one prver to rides, tapp hau ehes."',
  },
];

const TestimonialsSection = () => {
  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="koloi-container">
        <h2 className="text-3xl lg:text-4xl font-display font-bold text-foreground text-center mb-12 lg:mb-16">
          What our users are saying
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="flex gap-4">
              {/* Avatar */}
              <div className="shrink-0">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              </div>

              {/* Content */}
              <div>
                {/* Stars */}
                <div className="flex gap-0.5 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < testimonial.rating
                          ? 'text-accent fill-accent'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-foreground text-sm leading-relaxed">
                  {testimonial.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center gap-2 mt-12">
          <button className="w-8 h-1 bg-muted-foreground rounded-full hover:bg-accent transition-colors">
            <span className="sr-only">Previous</span>
          </button>
          <button className="w-8 h-1 bg-accent rounded-full">
            <span className="sr-only">Page 1</span>
          </button>
          <button className="w-8 h-1 bg-muted-foreground/30 rounded-full hover:bg-accent transition-colors">
            <span className="sr-only">Page 2</span>
          </button>
          <button className="w-8 h-1 bg-muted-foreground/30 rounded-full hover:bg-accent transition-colors">
            <span className="sr-only">Page 3</span>
          </button>
          <button className="w-8 h-1 bg-muted-foreground/30 rounded-full hover:bg-accent transition-colors">
            <span className="sr-only">Page 4</span>
          </button>
          <button className="w-8 h-1 bg-muted-foreground rounded-full hover:bg-accent transition-colors">
            <span className="sr-only">Next</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
