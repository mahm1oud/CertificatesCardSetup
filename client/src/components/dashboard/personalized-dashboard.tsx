import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingAnimation } from '@/components/loading-animation';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  Award, 
  Star, 
  Calendar, 
  Users, 
  FileText, 
  Download,
  Eye,
  Heart,
  Zap,
  Target,
  Trophy,
  Clock,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

interface UserStats {
  totalCertificates: number;
  templatesUsed: number;
  favoriteCategory: string;
  weeklyActivity: number[];
  monthlyGoal: number;
  achievementLevel: string;
  streakDays: number;
}

interface TemplateRecommendation {
  id: number;
  title: string;
  category: string;
  imageUrl: string;
  reason: string;
  confidence: number;
  trending: boolean;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  badge?: string;
}

export function PersonalizedDashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'year'>('month');

  // Fetch user statistics
  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/user/stats', selectedTimeframe],
    queryFn: async () => {
      const response = await fetch(`/api/user/stats?timeframe=${selectedTimeframe}`);
      return response.json();
    }
  });

  // Fetch smart template recommendations
  const { data: recommendations, isLoading: recsLoading } = useQuery({
    queryKey: ['/api/user/recommendations'],
    queryFn: async () => {
      const response = await fetch('/api/user/recommendations');
      return response.json();
    }
  });

  // Fetch user achievements
  const { data: achievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ['/api/user/achievements'],
    queryFn: async () => {
      const response = await fetch('/api/user/achievements');
      return response.json();
    }
  });

  if (statsLoading) {
    return <LoadingAnimation text="جارٍ تحميل لوحة المعلومات..." />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">مرحباً بك في لوحة المعلومات</h1>
          <p className="text-muted-foreground mt-1">
            تتبع إنجازاتك واكتشف قوالب جديدة مخصصة لك
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedTimeframe('week')} 
                  className={selectedTimeframe === 'week' ? 'bg-primary text-primary-foreground' : ''}>
            الأسبوع
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedTimeframe('month')}
                  className={selectedTimeframe === 'month' ? 'bg-primary text-primary-foreground' : ''}>
            الشهر
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedTimeframe('year')}
                  className={selectedTimeframe === 'year' ? 'bg-primary text-primary-foreground' : ''}>
            السنة
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي الشهادات</p>
                <p className="text-2xl font-bold">{userStats?.totalCertificates || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 ml-1" />
              <span className="text-green-500">+12%</span>
              <span className="text-muted-foreground mr-2">من الشهر الماضي</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">القوالب المستخدمة</p>
                <p className="text-2xl font-bold">{userStats?.templatesUsed || 0}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Activity className="h-4 w-4 text-blue-500 ml-1" />
              <span className="text-muted-foreground">قوالب متنوعة</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">التصنيف المفضل</p>
                <p className="text-2xl font-bold">{userStats?.favoriteCategory || 'غير محدد'}</p>
              </div>
              <Heart className="h-8 w-8 text-red-500" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Star className="h-4 w-4 text-yellow-500 ml-1" />
              <span className="text-muted-foreground">الأكثر استخداماً</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">سلسلة الأيام</p>
                <p className="text-2xl font-bold">{userStats?.streakDays || 0}</p>
              </div>
              <Zap className="h-8 w-8 text-orange-500" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Clock className="h-4 w-4 text-orange-500 ml-1" />
              <span className="text-muted-foreground">أيام متتالية</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart & Progress */}
        <div className="lg:col-span-2 space-y-6">
          {/* Weekly Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                النشاط الأسبوعي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userStats?.weeklyActivity?.map((value: number, index: number) => {
                  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-16">{days[index]}</span>
                      <Progress value={value} className="flex-1" />
                      <span className="text-sm text-muted-foreground w-8">{value}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Goal Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                هدف الشهر
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>الشهادات المنشأة</span>
                  <span className="font-bold">{userStats?.totalCertificates || 0} / {userStats?.monthlyGoal || 50}</span>
                </div>
                <Progress 
                  value={((userStats?.totalCertificates || 0) / (userStats?.monthlyGoal || 50)) * 100} 
                  className="h-3"
                />
                <p className="text-sm text-muted-foreground">
                  {userStats?.monthlyGoal - userStats?.totalCertificates > 0 
                    ? `تبقى ${userStats?.monthlyGoal - userStats?.totalCertificates} شهادات لتحقيق هدفك`
                    : 'تم تحقيق الهدف! 🎉'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Smart Recommendations */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                اقتراحات ذكية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recsLoading ? (
                <LoadingAnimation size="sm" text="جارٍ التحليل..." />
              ) : (
                recommendations?.slice(0, 3).map((rec: TemplateRecommendation) => (
                  <div key={rec.id} className="flex gap-3 p-3 rounded-lg border">
                    <img
                      src={rec.imageUrl || '/placeholder.jpg'}
                      alt={rec.title}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{rec.title}</h4>
                      <p className="text-xs text-muted-foreground">{rec.reason}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {rec.confidence}% مطابقة
                        </Badge>
                        {rec.trending && (
                          <Badge variant="outline" className="text-xs">
                            <TrendingUp className="h-3 w-3 ml-1" />
                            رائج
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <Button variant="outline" className="w-full">
                عرض المزيد من الاقتراحات
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Achievements Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            الإنجازات والجوائز
          </CardTitle>
        </CardHeader>
        <CardContent>
          {achievementsLoading ? (
            <LoadingAnimation size="sm" text="جارٍ تحميل الإنجازات..." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements?.map((achievement: Achievement) => (
                <div 
                  key={achievement.id} 
                  className={`p-4 rounded-lg border ${
                    achievement.unlocked 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`text-2xl ${achievement.unlocked ? '' : 'grayscale opacity-50'}`}>
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{achievement.title}</h4>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>التقدم</span>
                      <span>{achievement.progress} / {achievement.maxProgress}</span>
                    </div>
                    <Progress 
                      value={(achievement.progress / achievement.maxProgress) * 100} 
                      className="h-2"
                    />
                  </div>
                  
                  {achievement.unlocked && achievement.badge && (
                    <Badge className="mt-3 w-full justify-center">
                      <Award className="h-3 w-3 ml-1" />
                      {achievement.badge}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto flex-col gap-2 p-4">
              <FileText className="h-6 w-6" />
              <span>إنشاء شهادة جديدة</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4">
              <Eye className="h-6 w-6" />
              <span>استعراض القوالب</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4">
              <Download className="h-6 w-6" />
              <span>تحميل الشهادات</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4">
              <Users className="h-6 w-6" />
              <span>مشاركة مع الفريق</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}