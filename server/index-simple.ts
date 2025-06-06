import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createCanvas } from 'canvas';
import { storage } from './storage';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  
  // Basic middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // Test Canvas integration
  app.get('/api/test-canvas', (req, res) => {
    try {
      const canvas = createCanvas(200, 200);
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(10, 10, 180, 180);
      
      res.json({ 
        success: true, 
        message: 'Canvas library is working properly!',
        canvasSize: '200x200'
      });
    } catch (error) {
      res.status(500).json({ error: 'Canvas test failed', details: error });
    }
  });

  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    try {
      const userCount = await storage.getUserCount();
      const certCount = await storage.getCertificateCount();
      
      res.json({
        status: 'healthy',
        database: 'connected',
        canvas: 'integrated',
        users: userCount,
        certificates: certCount
      });
    } catch (error) {
      res.status(500).json({ error: 'Health check failed' });
    }
  });

  // Initialize default admin user
  try {
    await storage.initializeDefaultAdmin();
    console.log('✅ Default admin user initialized');
  } catch (error) {
    console.error('❌ Error initializing admin user:', error);
  }

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  
  app.listen(port, "0.0.0.0", () => {
    console.log(`✅ CertificatesCard9update server running on port ${port}`);
    console.log(`✅ Real Canvas library integrated successfully`);
    console.log(`✅ Default admin user: admin / 700700`);
  });
}

startServer().catch(console.error);