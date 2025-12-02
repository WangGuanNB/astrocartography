"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Mail, Send } from "lucide-react";
import type { ContactPage } from "@/types/pages/landing";

export default function ContactFormClient({ page }: { page: ContactPage }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address").min(1, "Email is required"),
    subject: z.string().min(1, "Subject is required"),
    message: z.string().min(10, "Message must be at least 10 characters"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || result.code !== 0) {
        throw new Error(result.message || page.form.error);
      }

      toast.success(page.form.success, {
        description: page.form.success_detail,
        duration: 5000,
      });
      setIsSubmitted(true);
      form.reset();
      
      // Reset success state after 8 seconds
      setTimeout(() => {
        setIsSubmitted(false);
      }, 8000);
    } catch (error: any) {
      console.error("Contact form submission error:", error);
      toast.error(page.form.error, {
        description: page.form.error_detail,
        duration: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-3">
            {page.form.success}
          </h2>
          <p className="text-green-700 dark:text-green-300 mb-4">
            {page.form.success_detail}
          </p>
          <p className="text-sm text-green-600 dark:text-green-400">
            {page.alternative.response}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 text-primary">
          {page.title}
        </h1>
        <p className="text-xl text-muted-foreground mb-2">
          {page.subtitle}
        </p>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {page.description}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="bg-card border rounded-lg p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{page.form.name.label}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={page.form.name.placeholder}
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{page.form.email.label}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={page.form.email.placeholder}
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{page.form.subject.label}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={page.form.subject.placeholder}
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{page.form.message.label}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={page.form.message.placeholder}
                          rows={8}
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {page.form.submitting}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {page.form.submit}
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              {page.alternative.title}
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {page.alternative.email.label}
                </p>
                <a
                  href={`mailto:${page.alternative.email.value}`}
                  className="text-primary hover:underline"
                >
                  {page.alternative.email.value}
                </a>
                <p className="text-sm text-muted-foreground mt-2">
                  {page.alternative.email.description}
                </p>
              </div>
              <p className="text-sm text-muted-foreground pt-4 border-t">
                {page.alternative.response}
              </p>
            </div>
          </div>

          {page.faq && page.faq.items && page.faq.items.length > 0 && (
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">{page.faq.title}</h3>
              <div className="space-y-4">
                {page.faq.items.map((item, index) => (
                  <div key={index}>
                    <p className="text-sm font-medium mb-1">{item.question}</p>
                    <p className="text-sm text-muted-foreground">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

