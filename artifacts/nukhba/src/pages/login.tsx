import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useLoginUser } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const formSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { setUser } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useLoginUser();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const user = await loginMutation.mutateAsync({ data: values });
      setUser(user);
      if (!user.onboardingDone) {
        setLocation("/welcome");
      } else {
        setLocation("/learn");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في تسجيل الدخول",
        description: error?.message || "تحقق من البريد الإلكتروني وكلمة المرور",
      });
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-[100px] -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass p-10 rounded-3xl border-gold/10 relative"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto rounded-xl gradient-gold flex items-center justify-center text-primary-foreground font-black text-4xl mb-6 shadow-lg shadow-gold/20">ن</div>
          <h1 className="text-3xl font-bold mb-2">أهلاً بعودتك</h1>
          <p className="text-muted-foreground">سجل دخولك لمتابعة رحلة تعلمك</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>البريد الإلكتروني</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" className="bg-background/50 border-white/10 h-12" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>كلمة المرور</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" className="bg-background/50 border-white/10 h-12" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full gradient-gold text-primary-foreground font-bold h-12 rounded-xl text-lg shadow-lg shadow-gold/20"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "جاري الدخول..." : "دخول"}
            </Button>
          </form>
        </Form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          ليس لديك حساب؟{" "}
          <Link href="/register" className="text-gold font-bold hover:underline">
            سجل الآن
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
