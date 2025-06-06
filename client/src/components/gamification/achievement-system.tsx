import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Trophy, 
  Star, 
  Medal, 
  Crown, 
  Zap, 
  Target, 
  Users, 
  Calendar,
  TrendingUp,
  Gift,
  Sparkles,
  Award,
  CheckCircle,
  Lock
} from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  category: 'creation' | 'usage' | 'sharing' | 'milestone' | 'special';
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedAt?: Date;
  requirements: string[];
  rewards: {
    points: number;
    badge?: string;
    title?: string;
    feature?: string;
  };
}

interface UserLevel {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  title: string;
  perks: string[];
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  fullName: string;
  points: number;
  level: number;
  achievements: number;
}

const achievementCategories = {
  creation: { name: 'الإبداع', icon: Sparkles, color: 'text-purple-600' },
  usage: { name: 'الاستخدام', icon: Target, color: 'text-blue-600' },
  sharing: { name: 'المشاركة', icon: Users, color: 'text-green-600' },
  milestone: { name: 'الإنجازات', icon: Trophy, color: 'text-yellow-600' },
  special: { name: 'خاص', icon: Crown, color: 'text-red-600' }
};

const difficultyColors = {
  bronze: 'text-amber-600 bg-amber-50 border-amber-200',
  silver: 'text-gray-600 bg-gray-50 border-gray-200',
  gold: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  platinum: 'text-purple-600 bg-purple-50 border-purple-200'
};

export function AchievementSystem() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false);
  const [celebrationAchievement, setCelebrationAchievement] = useState<Achievement | null>(null);
  const queryClient = useQueryClient();

  // Fetch user achievements
  const { data: achievements, isLoading } = useQuery({
    queryKey: ['/api/user/achievements'],
    queryFn: async () => {
      const response = await fetch('/api/user/achievements');
      return response.json();
    }
  });

  // Fetch user level information
  const { data: userLevel } = useQuery({
    queryKey: ['/api/user/level'],
    queryFn: async () => {
      const response = await fetch('/api/user/level');
      return response.json();
    }
  });

  // Fetch leaderboard
  const { data: leaderboard } = useQuery({
    queryKey: ['/api/leaderboard'],
    queryFn: async () => {
      const response = await fetch('/api/leaderboard');
      return response.json();
    }
  });

  // Claim achievement reward
  const claimReward = useMutation({
    mutationFn: async (achievementId: string) => {
      const response = await fetch('/api/user/achievements/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achievementId })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/achievements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/level'] });
    }
  });

  // Filter achievements
  const filteredAchievements = achievements?.filter((achievement: Achievement) => {
    if (selectedCategory !== 'all' && achievement.category !== selectedCategory) return false;
    if (showUnlockedOnly && !achievement.unlocked) return false;
    return true;
  });

  // Check for new achievements (this would be called from certificate creation, etc.)
  const checkAchievements = async () => {
    try {
      const response = await fetch('/api/user/achievements/check', { method: 'POST' });
      const newAchievements = await response.json();
      
      if (newAchievements?.length > 0) {
        // Show celebration for the first new achievement
        setCelebrationAchievement(newAchievements[0]);
        queryClient.invalidateQueries({ queryKey: ['/api/user/achievements'] });
      }
    } catch (error) {
      console.error('خطأ في فحص الإنجازات:', error);
    }
  };

  const getProgressPercentage = (achievement: Achievement) => {
    return (achievement.progress / achievement.maxProgress) * 100;
  };

  const getLevelProgress = (userLevel: UserLevel) => {
    return (userLevel.currentXP / userLevel.nextLevelXP) * 100;
  };

  return (
    <div className="space-y-6">
      {/* User Level & Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                  {userLevel?.level || 1}
                </div>
                <div className="absolute -top-2 -right-2">
                  <Crown className="h-6 w-6 text-yellow-500" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold">{userLevel?.title || 'مبتدئ'}</h2>
                <p className="text-muted-foreground">
                  {userLevel?.currentXP || 0} نقطة من {userLevel?.nextLevelXP || 100} للمستوى التالي
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="font-bold">{achievements?.filter((a: Achievement) => a.unlocked).length || 0}</span>
                <span className="text-muted-foreground">إنجاز مكتمل</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-purple-500" />
                <span className="font-bold">{userLevel?.currentXP || 0}</span>
                <span className="text-muted-foreground">نقطة</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>تقدم المستوى</span>
              <span>{Math.round(getLevelProgress(userLevel))}%</span>
            </div>
            <Progress value={getLevelProgress(userLevel)} className="h-3" />
          </div>

          {userLevel?.perks && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">مزايا المستوى الحالي:</h4>
              <div className="flex flex-wrap gap-2">
                {userLevel.perks.map((perk: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {perk}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            الكل
          </Button>
          {Object.entries(achievementCategories).map(([key, category]) => {
            const IconComponent = category.icon;
            return (
              <Button
                key={key}
                variant={selectedCategory === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(key)}
                className="gap-2"
              >
                <IconComponent className="h-4 w-4" />
                {category.name}
              </Button>
            );
          })}
        </div>
        
        <Button
          variant={showUnlockedOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowUnlockedOnly(!showUnlockedOnly)}
          className="gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          المكتملة فقط
        </Button>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements?.map((achievement: Achievement) => {
          const categoryInfo = achievementCategories[achievement.category];
          const IconComponent = categoryInfo?.icon || Trophy;
          
          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className={`relative ${achievement.unlocked ? 'border-green-200 bg-green-50' : ''}`}>
                {achievement.unlocked && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                )}
                
                {!achievement.unlocked && achievement.progress === 0 && (
                  <div className="absolute top-2 right-2">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                )}

                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className={`text-3xl ${achievement.unlocked ? '' : 'grayscale opacity-50'}`}>
                      {achievement.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-xs ${difficultyColors[achievement.difficulty]}`}>
                          {achievement.difficulty}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {achievement.points} نقطة
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{achievement.titleAr}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {achievement.descriptionAr}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>التقدم</span>
                        <span>{achievement.progress} / {achievement.maxProgress}</span>
                      </div>
                      <Progress value={getProgressPercentage(achievement)} className="h-2" />
                    </div>

                    {/* Requirements */}
                    <div className="space-y-1">
                      <h5 className="text-sm font-medium">المتطلبات:</h5>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {achievement.requirements.map((req: string, index: number) => (
                          <li key={index} className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-current rounded-full" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Rewards */}
                    {achievement.rewards && (
                      <div className="space-y-1">
                        <h5 className="text-sm font-medium">الجوائز:</h5>
                        <div className="flex flex-wrap gap-1">
                          {achievement.rewards.badge && (
                            <Badge variant="secondary" className="text-xs">
                              <Award className="h-3 w-3 ml-1" />
                              {achievement.rewards.badge}
                            </Badge>
                          )}
                          {achievement.rewards.title && (
                            <Badge variant="secondary" className="text-xs">
                              <Crown className="h-3 w-3 ml-1" />
                              {achievement.rewards.title}
                            </Badge>
                          )}
                          {achievement.rewards.feature && (
                            <Badge variant="secondary" className="text-xs">
                              <Zap className="h-3 w-3 ml-1" />
                              {achievement.rewards.feature}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Claim Button */}
                    {achievement.unlocked && (
                      <Button 
                        size="sm" 
                        className="w-full gap-2"
                        onClick={() => claimReward.mutate(achievement.id)}
                        disabled={claimReward.isPending}
                      >
                        <Gift className="h-4 w-4" />
                        استلام الجائزة
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            لوحة المتصدرين
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leaderboard?.slice(0, 10).map((entry: LeaderboardEntry, index: number) => (
              <div key={entry.rank} className="flex items-center gap-4 p-3 rounded-lg border">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0 ? 'bg-yellow-500 text-white' :
                  index === 1 ? 'bg-gray-400 text-white' :
                  index === 2 ? 'bg-amber-600 text-white' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {entry.rank}
                </div>
                
                <div className="flex-1">
                  <h4 className="font-medium">{entry.fullName}</h4>
                  <p className="text-sm text-muted-foreground">@{entry.username}</p>
                </div>
                
                <div className="text-right">
                  <div className="font-bold">{entry.points} نقطة</div>
                  <div className="text-sm text-muted-foreground">
                    المستوى {entry.level} • {entry.achievements} إنجاز
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Achievement Celebration Modal */}
      <AnimatePresence>
        {celebrationAchievement && (
          <Dialog open={true} onOpenChange={() => setCelebrationAchievement(null)}>
            <DialogContent className="max-w-md">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="text-center space-y-4"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                  className="text-6xl"
                >
                  {celebrationAchievement.icon}
                </motion.div>
                
                <DialogHeader>
                  <DialogTitle className="text-2xl text-center">
                    🎉 إنجاز جديد!
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">{celebrationAchievement.titleAr}</h3>
                  <p className="text-muted-foreground">{celebrationAchievement.descriptionAr}</p>
                </div>
                
                <div className="flex justify-center gap-2">
                  <Badge className={difficultyColors[celebrationAchievement.difficulty]}>
                    {celebrationAchievement.difficulty}
                  </Badge>
                  <Badge variant="outline">
                    +{celebrationAchievement.points} نقطة
                  </Badge>
                </div>
                
                <Button 
                  onClick={() => setCelebrationAchievement(null)}
                  className="w-full"
                >
                  رائع!
                </Button>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}