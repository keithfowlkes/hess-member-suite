-- Create table to store map coordinate configurations
CREATE TABLE public.map_coordinates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state_code text NOT NULL UNIQUE,
  x_coordinate numeric NOT NULL,
  y_coordinate numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.map_coordinates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view map coordinates" 
ON public.map_coordinates 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage map coordinates" 
ON public.map_coordinates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_map_coordinates_updated_at
BEFORE UPDATE ON public.map_coordinates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default coordinates
INSERT INTO public.map_coordinates (state_code, x_coordinate, y_coordinate) VALUES
('AL', 642, 333),
('AK', 31, 432),
('AZ', 187, 290),
('AR', 555, 298),
('CA', 64, 188),
('CO', 340, 249),
('CT', 820, 180),
('DE', 798, 200),
('FL', 748, 415),
('GA', 698, 316),
('HI', 164, 415),
('ID', 217, 113),
('IL', 605, 200),
('IN', 633, 187),
('IA', 555, 155),
('KS', 472, 244),
('KY', 655, 208),
('LA', 555, 377),
('ME', 859, 65),
('MD', 798, 187),
('MA', 830, 113),
('MI', 633, 113),
('MN', 533, 91),
('MS', 605, 346),
('MO', 555, 215),
('MT', 289, 91),
('NE', 453, 175),
('NV', 144, 175),
('NH', 830, 91),
('NJ', 808, 180),
('NM', 289, 290),
('NY', 786, 113),
('NC', 734, 261),
('ND', 453, 65),
('OH', 681, 180),
('OK', 472, 272),
('OR', 99, 91),
('PA', 759, 168),
('RI', 842, 130),
('SC', 734, 290),
('SD', 453, 113),
('TN', 655, 244),
('TX', 453, 346),
('UT', 252, 215),
('VT', 808, 91),
('VA', 759, 208),
('WA', 120, 51),
('WV', 734, 187),
('WI', 582, 91),
('WY', 289, 157);