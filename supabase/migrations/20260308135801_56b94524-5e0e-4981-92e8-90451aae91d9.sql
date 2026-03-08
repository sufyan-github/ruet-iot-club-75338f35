-- Allow authenticated users to insert their own blog posts
CREATE POLICY "Authenticated users can create blog posts"
ON public.blog_posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

-- Allow users to update their own unpublished blog posts
CREATE POLICY "Users can update own unpublished posts"
ON public.blog_posts
FOR UPDATE
TO authenticated
USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete blog posts
CREATE POLICY "Admins can delete blog posts"
ON public.blog_posts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));