'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const authSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少6个字符'),
});

type AuthFormData = z.infer<typeof authSchema>;

export function AuthForm() {
  const { signIn, signUp } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  const onSubmit = async (data: AuthFormData) => {
    setError(null);
    const result = isRegister
      ? await signUp(data.email, data.password)
      : await signIn(data.email, data.password);
    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-pink-100">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 text-4xl">💕</div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            虚拟男友
          </CardTitle>
          <CardDescription>
            {isRegister ? '创建账号，开始你的恋爱之旅' : '登录你的账号'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="至少6个字符"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button
              type="submit"
              className={cn(
                'w-full font-semibold',
                'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600',
                'text-white shadow-md'
              )}
              disabled={isSubmitting}
            >
              {isSubmitting ? '请稍候...' : isRegister ? '注册' : '登录'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-500">
            {isRegister ? '已有账号？' : '还没有账号？'}
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(null); }}
              className="ml-1 text-pink-500 hover:text-pink-600 font-medium"
            >
              {isRegister ? '去登录' : '去注册'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
