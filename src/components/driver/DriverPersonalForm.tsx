import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(10, 'Phone is required').regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone'),
  email: z.string().email('Invalid email'),
  city: z.string().min(2, 'City is required'),
  nationalId: z.string().min(5, 'National ID is required'),
});

type FormData = z.infer<typeof schema>;

export default function DriverPersonalForm({ onNext, onBack }: { onNext: (data: FormData) => void; onBack?: () => void }) {
  const navigate = useNavigate();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      city: '',
      nationalId: '',
    },
  });

  const onSubmit = (data: FormData) => {
    onNext(data);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-center mb-8">
        <div className="flex items-center gap-2 justify-center mb-2 text-xs text-muted-foreground">
          <div className="flex-1 h-1 bg-muted rounded-full" />
          <div className="w-8 h-1 bg-accent rounded-full" />
          <div className="flex-1 h-1 bg-muted rounded-full" />
        </div>
        <div className="text-sm font-medium text-muted-foreground">Step 2 of 6</div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="fullName" render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input {...field} className="h-14 rounded-xl" placeholder="John Doe" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Phone number</FormLabel>
              <FormControl>
                <Input {...field} className="h-14 rounded-xl" placeholder="+263 77 123 4567" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} className="h-14 rounded-xl" type="email" placeholder="john@example.com" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input {...field} className="h-14 rounded-xl" placeholder="Bulawayo" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="nationalId" render={({ field }) => (
            <FormItem>
              <FormLabel>National ID</FormLabel>
              <FormControl>
                <Input {...field} className="h-14 rounded-xl" placeholder="12-3456-78-901XX" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1 h-14 rounded-xl" onClick={() => onBack ? onBack() : navigate('/driver/register')}>
              Back
            </Button>
            <Button type="submit" className="flex-1 h-14 rounded-xl bg-primary text-primary-foreground">
              Next
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}


