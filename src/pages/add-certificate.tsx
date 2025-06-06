import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { insertCertificateSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

// Create a simplified form schema for the certificate
const formSchema = z.object({
  title: z.string().min(1, "عنوان الشهادة مطلوب"),
  recipient: z.string().min(1, "اسم المستفيد مطلوب"),
  issuer: z.string().min(1, "جهة الإصدار مطلوبة"),
  duration: z.number().min(1, "مدة الصلاحية مطلوبة"),
});

type FormData = z.infer<typeof formSchema>;

export default function AddCertificate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      recipient: "",
      issuer: "",
      duration: 12,
    },
  });

  // Certificate creation mutation
  const createCertificate = useMutation({
    mutationFn: async (values: FormData) => {
      const certificateData = {
        ...values,
        code: `CERT-${Date.now()}`,
        userId: 1, // Default user ID
        data: {},
        isVerified: false,
      };
      return await apiRequest("POST", "/api/certificates", certificateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
      toast({
        title: "تم إنشاء الشهادة بنجاح",
        description: "تمت إضافة الشهادة الجديدة إلى النظام",
      });
      setLocation("/user/certificates");
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إنشاء الشهادة",
        description: error.message || "حدث خطأ أثناء إنشاء الشهادة",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: FormData) {
    createCertificate.mutate(values);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">إضافة شهادة جديدة</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>معلومات الشهادة</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>عنوان الشهادة</FormLabel>
                          <FormControl>
                            <Input placeholder="أدخل عنوان الشهادة" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recipient"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>اسم المستفيد</FormLabel>
                          <FormControl>
                            <Input placeholder="أدخل اسم المستفيد" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="issuer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>جهة الإصدار</FormLabel>
                          <FormControl>
                            <Input placeholder="أدخل جهة الإصدار" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>مدة الصلاحية (بالأشهر)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="12" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-4 space-x-reverse">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation("/user/certificates")}
                    >
                      إلغاء
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createCertificate.isPending}
                    >
                      {createCertificate.isPending ? "جاري الإضافة..." : "حفظ الشهادة"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}