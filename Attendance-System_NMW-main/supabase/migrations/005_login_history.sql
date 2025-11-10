
CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  login_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  browser TEXT,
  device TEXT,
  os TEXT,
  location TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  logout_time TIMESTAMP WITH TIME ZONE,
  session_duration INTEGER, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX idx_login_history_login_time ON public.login_history(login_time DESC);
CREATE INDEX idx_login_history_user_email ON public.login_history(user_email);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all login history
CREATE POLICY "Allow authenticated users to read login history" 
ON public.login_history 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to insert their own login history
CREATE POLICY "Allow authenticated users to insert login history" 
ON public.login_history 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');


CREATE POLICY "Allow authenticated users to update login history" 
ON public.login_history 
FOR UPDATE 
USING (auth.uid() = user_id);


COMMENT ON TABLE public.login_history IS 'Tracks user login/logout activity with detailed session information';
COMMENT ON COLUMN public.login_history.user_id IS 'Reference to auth.users id';
COMMENT ON COLUMN public.login_history.user_email IS 'Email of the user who logged in';
COMMENT ON COLUMN public.login_history.login_time IS 'Timestamp when user logged in';
COMMENT ON COLUMN public.login_history.ip_address IS 'IP address of the user';
COMMENT ON COLUMN public.login_history.user_agent IS 'Browser user agent string';
COMMENT ON COLUMN public.login_history.browser IS 'Browser name and version';
COMMENT ON COLUMN public.login_history.device IS 'Device type (mobile, tablet, desktop)';
COMMENT ON COLUMN public.login_history.os IS 'Operating system';
COMMENT ON COLUMN public.login_history.location IS 'Approximate location based on IP (if available)';
COMMENT ON COLUMN public.login_history.success IS 'Whether login was successful';
COMMENT ON COLUMN public.login_history.logout_time IS 'Timestamp when user logged out';
COMMENT ON COLUMN public.login_history.session_duration IS 'Session duration in seconds';


CREATE OR REPLACE FUNCTION public.cleanup_old_login_history(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete login history older than specified days
  WITH deleted AS (
    DELETE FROM public.login_history
    WHERE login_time < (CURRENT_TIMESTAMP - (days_to_keep || ' days')::INTERVAL)
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.cleanup_old_login_history IS 'Removes login history older than specified days (default 90 days)';


DO $$
BEGIN
  RAISE NOTICE 'Login history table created successfully!';
  RAISE NOTICE 'Table: login_history with policies and indexes';
  RAISE NOTICE 'Function: cleanup_old_login_history() for maintenance';
END $$;
