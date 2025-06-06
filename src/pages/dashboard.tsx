import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AdminLayout from "@/components/admin-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { SearchFilters } from "@/components/dashboard/search-filters";
import { CertificateCard } from "@/components/certificates/certificate-card";
import { CertificateModal } from "@/components/certificates/certificate-modal";
import Pagination from "@/components/pagination";
import { Certificate } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Plus, TrendingUp, Users, Award, FileText } from "lucide-react";

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { toast } = useToast();
  const itemsPerPage = 6;

  // Fetch statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  // Fetch certificates with filters
  const { data: certificatesData, isLoading: certificatesLoading } = useQuery({
    queryKey: ["/api/certificates", searchTerm, statusFilter, dateFilter, currentPage],
    queryFn: () => {
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append("search", searchTerm);
      if (statusFilter) queryParams.append("status", statusFilter);
      if (dateFilter) queryParams.append("date", dateFilter);
      queryParams.append("page", currentPage.toString());
      queryParams.append("limit", itemsPerPage.toString());
      
      return fetch(`/api/certificates?${queryParams.toString()}`).then(res => res.json());
    },
  });

  const certificates = certificatesData?.certificates || [];
  const totalItems = certificatesData?.total || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleDateChange = (value: string) => {
    setDateFilter(value);
    setCurrentPage(1);
  };

  const handleViewCertificate = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setIsModalOpen(true);
  };

  const handleEditCertificate = (certificate: Certificate) => {
    // Redirect to edit page (to be implemented)
    toast({
      title: "تحت التطوير",
      description: "ميزة تعديل الشهادة غير متاحة حالياً",
    });
  };

  const handleDeleteCertificate = (certificate: Certificate) => {
    // Show delete confirmation (to be implemented)
    toast({
      title: "تحت التطوير",
      description: "ميزة حذف الشهادة غير متاحة حالياً",
      variant: "destructive",
    });
  };

  const handleDownloadCertificate = (certificate: Certificate) => {
    toast({
      title: "تحت التطوير",
      description: "ميزة تحميل الشهادة غير متاحة حالياً",
    });
  };

  const handlePrintCertificate = (certificate: Certificate) => {
    toast({
      title: "تحت التطوير",
      description: "ميزة طباعة الشهادة غير متاحة حالياً",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">لوحة التحكم</h1>
            <p className="text-gray-600 mt-1">مرحباً بك في لوحة التحكم الرئيسية</p>
          </div>
          <Link href="/add-certificate">
            <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              إضافة شهادة جديدة
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            // Skeleton loading for stats
            Array(4).fill(0).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="animate-pulse flex items-center">
                    <div className="rounded-md bg-gray-200 h-12 w-12"></div>
                    <div className="mr-5 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-8 bg-gray-200 rounded w-1/2 mt-2"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Award className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600">إجمالي الشهادات</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.totalCertificates || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600">الشهادات المصدقة</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.verifiedCertificates || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <FileText className="w-8 h-8 text-yellow-600" />
                    </div>
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600">قيد الانتظار</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.pendingCertificates || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="w-8 h-8 text-purple-600" />
                    </div>
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600">إجمالي المستخدمين</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Recent Certificates Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>آخر الشهادات</span>
              <SearchFilters
                onSearch={handleSearch}
                onStatusChange={handleStatusChange}
                onDateChange={handleDateChange}
              />
            </CardTitle>
            <CardDescription>
              أحدث الشهادات المضافة إلى النظام
            </CardDescription>
          </CardHeader>
          <CardContent>
            {certificatesLoading ? (
              // Skeleton loading for certificates
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array(6).fill(0).map((_, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="animate-pulse">
                        <div className="h-48 bg-gray-200 w-full rounded mb-4"></div>
                        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="flex space-x-2 space-x-reverse">
                          <div className="h-8 bg-gray-200 rounded w-16"></div>
                          <div className="h-8 bg-gray-200 rounded w-16"></div>
                          <div className="h-8 bg-gray-200 rounded w-16"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : certificates.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {certificates.map((certificate) => (
                  <CertificateCard
                    key={certificate.id}
                    certificate={certificate}
                    onView={handleViewCertificate}
                    onEdit={handleEditCertificate}
                    onDelete={handleDeleteCertificate}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد شهادات</h3>
                <p className="text-gray-500 mb-4">لم يتم العثور على شهادات مطابقة لمعايير البحث</p>
                <Link href="/add-certificate">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    إضافة شهادة جديدة
                  </Button>
                </Link>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 0 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Certificate Details Modal */}
      <CertificateModal
        certificate={selectedCertificate}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDownload={handleDownloadCertificate}
        onPrint={handlePrintCertificate}
      />
    </AdminLayout>
  );
}
