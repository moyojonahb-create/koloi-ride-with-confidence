import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  carMake: z.string().min(2, 'Car make is required'),
  carModel: z.string().min(2, 'Car model is required'),
  carYear: z.number().min(1990, 'Year must be 1990+').max(new Date().getFullYear() + 1),
  plateNumber: z.string().min(3, 'Plate number is required'),
  vehicleColor: z.string().min(2, 'Color is required'),
  seats: z.number().min(4, 'Minimum 4 seats'),
});

type FormData = z.infer<typeof schema>;

export default function DriverVehicleForm({ onNext }: { onNext: (data: FormData) => void }) {
  const navigate = useNavigate();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      carMake: '',
      carModel: '',
      carYear: new Date().getFullYear(),
      plateNumber: '',
      vehicleColor: '',
      seats: 4,
    },
  });

  const onSubmit = (data: FormData) => {
    onNext(data);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-center mb-8">
        <div className="flex items-center gap-2 justify-center mb-2 text-xs text-muted-foreground">
          <div className="w-16 h-1 bg-accent rounded-full" />
          <div className="flex-1 h-1 bg-muted rounded-full" />
          <div className="flex-1 h-1 bg-muted rounded-full" />
        </div>
        <div className="text-sm font-medium text-muted-foreground">Step 3 of 6</div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="carMake" render={({ field }) => (
            <FormItem>
              <FormLabel>Car make</FormLabel>
              <FormControl>
                <Input {...field} className="h-14 rounded-xl" placeholder="Toyota" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="carModel" render={({ field }) => (
            <FormItem>
              <FormLabel>Car model</FormLabel>
              <FormControl>
                <Input {...field} className="h-14 rounded-xl" placeholder="Corolla" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="carYear" render={({ field }) => (
              <FormItem>
                <FormLabel>Year</FormLabel>
                <FormControl>
                  <Input type="number" {...field} className="h-14 rounded-xl" onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="seats" render={({ field }) => (
              <FormItem>
                <FormLabel>Seats</FormLabel>
                <FormControl>
                  <Input type="number" {...field} className="h-14 rounded-xl" onChange={(e) => field.onChange(parseInt(e.target.value) || 4)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="plateNumber" render={({ field }) => (
            <FormItem>
              <FormLabel>Plate number</FormLabel>
              <FormControl>
                <Input {...field} className="h-14 rounded-xl" placeholder="ABC 123 A" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="vehicleColor" render={({ field }) => (
            <FormItem>
              <FormLabel>Vehicle color</FormLabel>
              <FormControl>
                <Input {...field} className="h-14 rounded-xl" placeholder="White" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1 h-14 rounded-xl" onClick={() => navigate('/driver/register/step1')}>
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

