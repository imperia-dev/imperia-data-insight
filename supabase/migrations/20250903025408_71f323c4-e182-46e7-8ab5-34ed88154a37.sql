-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('master', 'admin', 'operation');

-- Create enum for document status
CREATE TYPE document_status AS ENUM ('pending', 'in_progress', 'review', 'completed', 'delivered');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'operation',
  hourly_rate DECIMAL(10,2),
  daily_rate DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  project_name TEXT,
  assigned_to UUID REFERENCES public.profiles(id),
  status document_status DEFAULT 'pending',
  word_count INTEGER,
  pages INTEGER,
  deadline TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  payment_amount DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Create productivity tracking table
CREATE TABLE public.productivity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  date DATE NOT NULL,
  hours_worked DECIMAL(4,2),
  documents_completed INTEGER DEFAULT 0,
  words_translated INTEGER DEFAULT 0,
  pages_translated INTEGER DEFAULT 0,
  daily_earnings DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create financial records table
CREATE TABLE public.financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  document_id UUID REFERENCES public.documents(id),
  type TEXT CHECK (type IN ('payment', 'expense', 'bonus')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  payment_date DATE NOT NULL,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productivity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Master and admin can view all profiles" ON public.profiles
  FOR SELECT USING (
    public.get_user_role(auth.uid()) IN ('master', 'admin')
  );

CREATE POLICY "Master can update all profiles" ON public.profiles
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'master');

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Master can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'master');

-- Documents policies
CREATE POLICY "Users can view assigned documents" ON public.documents
  FOR SELECT USING (
    assigned_to = auth.uid() OR 
    public.get_user_role(auth.uid()) IN ('master', 'admin')
  );

CREATE POLICY "Master and admin can insert documents" ON public.documents
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) IN ('master', 'admin')
  );

CREATE POLICY "Master and admin can update documents" ON public.documents
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) IN ('master', 'admin')
  );

CREATE POLICY "Operation can update own documents" ON public.documents
  FOR UPDATE USING (
    assigned_to = auth.uid() AND 
    public.get_user_role(auth.uid()) = 'operation'
  );

CREATE POLICY "Master can delete documents" ON public.documents
  FOR DELETE USING (public.get_user_role(auth.uid()) = 'master');

-- Productivity policies
CREATE POLICY "Users can view own productivity" ON public.productivity
  FOR SELECT USING (
    user_id = auth.uid() OR 
    public.get_user_role(auth.uid()) IN ('master', 'admin')
  );

CREATE POLICY "Users can insert own productivity" ON public.productivity
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    public.get_user_role(auth.uid()) IN ('master', 'admin')
  );

CREATE POLICY "Users can update own productivity" ON public.productivity
  FOR UPDATE USING (
    user_id = auth.uid() OR
    public.get_user_role(auth.uid()) IN ('master', 'admin')
  );

CREATE POLICY "Master can delete productivity" ON public.productivity
  FOR DELETE USING (public.get_user_role(auth.uid()) = 'master');

-- Financial records policies
CREATE POLICY "Master and admin can view all financial records" ON public.financial_records
  FOR SELECT USING (public.get_user_role(auth.uid()) IN ('master', 'admin'));

CREATE POLICY "Users can view own financial records" ON public.financial_records
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Master can manage financial records" ON public.financial_records
  FOR ALL USING (public.get_user_role(auth.uid()) = 'master');

CREATE POLICY "Admin can insert financial records" ON public.financial_records
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_productivity_updated_at BEFORE UPDATE ON public.productivity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_records_updated_at BEFORE UPDATE ON public.financial_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'operation')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();