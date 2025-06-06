import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, CheckCircle, XCircle, ArrowLeft, Globe, Download, Share } from "lucide-react";
import { formatDate } from "@/lib/helpers";
import { Certificate as CertificateType } from "@shared/schema";
import { AlertCircle } from "lucide-react";

export default function Certificate() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const certificateId = parseInt(id || "0");

  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/certificates/${certificateId}`],
    enabled: !isNaN(certificateId) && certificateId > 0,
  });

  const certificate = data?.certificate as CertificateType | undefined;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg w-full max-w-3xl h-96"></div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Certificate Not Found</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {(error as Error)?.message || "The certificate you are looking for does not exist."}
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </div>
    );
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: certificate.title,
        text: `Check out my certificate: ${certificate.title}`,
        url: window.location.href,
      }).catch((error) => {
        toast({
          title: "Share failed",
          description: error.message,
          variant: "destructive",
        });
      });
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        toast({
          title: "Link copied",
          description: "Certificate link copied to clipboard",
        });
      });
    }
  };

  return (
    <div className="container mx-auto max-w-3xl">
      <Button variant="outline" className="mb-6" onClick={() => navigate("/")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Certificates
      </Button>

      <Card className="shadow-lg dark:shadow-gray-900/20">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold">{certificate.title}</CardTitle>
              <CardDescription className="mt-2">
                {certificate.description || "No description provided"}
              </CardDescription>
            </div>
            <Badge variant={certificate.isVerified ? "default" : "outline"} className="text-sm px-3 py-1">
              {certificate.isVerified ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {certificate.isVerified ? "Verified" : "Unverified"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Issue Date</h3>
                <p className="flex items-center mt-1">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  {formatDate(certificate.issueDate)}
                </p>
              </div>
              {certificate.expiryDate && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Expiry Date</h3>
                  <p className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    {formatDate(certificate.expiryDate)}
                  </p>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Certificate Code</h3>
              <div className="mt-2 p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 font-mono text-sm overflow-auto">
                {certificate.certificateCode}
              </div>
            </div>
          </div>

          {certificate.imageUrl && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Certificate Image</h3>
              <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <img 
                  src={certificate.imageUrl} 
                  alt={certificate.title} 
                  className="w-full h-auto"
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={handleShare}>
              <Share className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" className="flex-1">
              <Globe className="mr-2 h-4 w-4" />
              Verify Online
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
