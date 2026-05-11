import { useState } from "react";
import { z } from "zod";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100),
  company: z.string().trim().max(150).optional().or(z.literal("")),
  phone: z.string().trim().min(7, "Enter a valid phone").max(20),
  email: z.string().trim().email("Enter a valid email").max(255).optional().or(z.literal("")),
  machine_type: z.string().trim().max(100).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

type FormState = z.infer<typeof schema>;

const initial: FormState = { name: "", company: "", phone: "", email: "", machine_type: "", message: "" };

export const Contact = () => {
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(false);

  const handleChange =
    (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof FormState;
        if (!fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    const payload = {
      name: parsed.data.name,
      company: parsed.data.company || null,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      machine_type: parsed.data.machine_type || null,
      message: parsed.data.message || null,
    };
    const { error } = await supabase.from("leads").insert(payload);
    setLoading(false);
    if (error) {
      toast.error("Could not submit. Please try again.");
      return;
    }
    toast.success("Thanks! Our team will reach out shortly.");
    setForm(initial);
  };

  return (
    <section id="contact" className="relative py-24 sm:py-32">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent font-medium">Contact</p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
              Tell us about your machine. We'll take it from there.
            </h2>
            <p className="mt-4 text-muted-foreground max-w-md">
              Share a few details and our service team will get back to you within one working day
              with diagnostics and a quote.
            </p>

            <div className="mt-10 space-y-5">
              <a href="tel:+910000000000" className="flex items-start gap-4 group">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary group-hover:bg-accent-gradient group-hover:text-accent-foreground transition-colors">
                  <Phone className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-sm text-muted-foreground">Call us</div>
                  <div className="font-medium">+91 00000 00000</div>
                </div>
              </a>
              <a href="https://wa.me/910000000000" className="flex items-start gap-4 group" target="_blank" rel="noreferrer">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary group-hover:bg-accent-gradient group-hover:text-accent-foreground transition-colors">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-sm text-muted-foreground">WhatsApp</div>
                  <div className="font-medium">Chat with our team</div>
                </div>
              </a>
              <a href="mailto:contact@phdautomations.in" className="flex items-start gap-4 group">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary group-hover:bg-accent-gradient group-hover:text-accent-foreground transition-colors">
                  <Mail className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="font-medium">contact@phdautomations.in</div>
                </div>
              </a>
              <div className="flex items-start gap-4">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary">
                  <MapPin className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-sm text-muted-foreground">Address</div>
                  <div className="font-medium">PHD Automations, India</div>
                </div>
              </div>
            </div>
          </div>

          <motion.form
            onSubmit={onSubmit}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-card-elev ring-gradient"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Full name *</Label>
                <Input id="name" value={form.name} onChange={handleChange("name")} className="mt-1.5" />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={form.company} onChange={handleChange("company")} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" value={form.phone} onChange={handleChange("phone")} className="mt-1.5" />
                {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={handleChange("email")} className="mt-1.5" />
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="machine_type">Machine type</Label>
                <Input
                  id="machine_type"
                  placeholder="e.g. CNC Lathe, VMC, HMC, brand & model"
                  value={form.machine_type}
                  onChange={handleChange("machine_type")}
                  className="mt-1.5"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="message">How can we help?</Label>
                <Textarea
                  id="message"
                  rows={4}
                  placeholder="Describe the issue or service required"
                  value={form.message}
                  onChange={handleChange("message")}
                  className="mt-1.5"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="mt-6 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Inquiry"}
            </Button>

            <p className="mt-3 text-xs text-muted-foreground text-center">
              By submitting you agree to be contacted by our team about your inquiry.
            </p>
          </motion.form>
        </div>
      </div>
    </section>
  );
};
