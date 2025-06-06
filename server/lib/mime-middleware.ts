/**
 * Middleware to fix MIME types for static files
 * This middleware should be applied before serving static files
 */
import { Request, Response, NextFunction } from 'express';
import path from 'path';

export function mimeMiddleware(req: Request, res: Response, next: NextFunction) {
  // Get the path from the URL
  const urlPath = req.path;
  
  // معالجة محسنة لوحدات JavaScript وTypeScript
  if (urlPath.match(/\.(js|mjs|jsx|ts|tsx)(\?[^?]*)?$/)) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  } else if (urlPath.endsWith('.css') || urlPath.includes('.css?')) {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
  } else if (urlPath.endsWith('.svg') || urlPath.includes('.svg?')) {
    res.setHeader('Content-Type', 'image/svg+xml');
  } else if (urlPath.endsWith('.json') || urlPath.includes('.json?')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  } else if (urlPath.endsWith('.html') || urlPath.includes('.html?')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
  } else if (urlPath.endsWith('.txt') || urlPath.includes('.txt?')) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  } else if (urlPath.endsWith('.woff') || urlPath.includes('.woff?')) {
    res.setHeader('Content-Type', 'font/woff');
  } else if (urlPath.endsWith('.woff2') || urlPath.includes('.woff2?')) {
    res.setHeader('Content-Type', 'font/woff2');
  } else if (urlPath.endsWith('.ttf') || urlPath.includes('.ttf?')) {
    res.setHeader('Content-Type', 'font/ttf');
  } else if (urlPath.match(/\.(jpg|jpeg)(\?[^?]*)?$/)) {
    res.setHeader('Content-Type', 'image/jpeg');
  } else if (urlPath.endsWith('.png') || urlPath.includes('.png?')) {
    res.setHeader('Content-Type', 'image/png');
  } else if (urlPath.endsWith('.gif') || urlPath.includes('.gif?')) {
    res.setHeader('Content-Type', 'image/gif');
  } else if (urlPath.endsWith('.webp') || urlPath.includes('.webp?')) {
    res.setHeader('Content-Type', 'image/webp');
  }
  
  // اضافة رؤوس خاصة بوحدات JavaScript
  if (urlPath.match(/\.(js|mjs|jsx|ts|tsx)(\?[^?]*)?$/)) {
    // إضافة رؤوس مهمة لتشغيل وحدات ES
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
  
  // معالجة رؤوس CORS للسماح باستخدام الموارد عبر المنشأ
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // اضافة رأس Cross-Origin-Resource-Policy للسماح باستخدام الموارد عبر المنشأ
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // اضافة رأس Cross-Origin-Embedder-Policy
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none'); // تغيير من require-corp إلى unsafe-none 
  
  next();
}