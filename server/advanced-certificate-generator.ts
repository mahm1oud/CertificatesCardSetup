import { templates, templateFields, layers } from '../shared/schema.js';
import { createCanvas, loadImage, registerFont, CanvasRenderingContext2D } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { db } from './db.js';
import { eq } from 'drizzle-orm';

type Template = typeof templates.$inferSelect;
type TemplateField = typeof templateFields.$inferSelect;
type Layer = typeof layers.$inferSelect;

export interface CustomizationOptions {
  backgroundColor?: string;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted' | 'double';
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  watermark?: {
    text?: string;
    image?: string;
    opacity?: number;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    size?: number;
  };
  shadow?: {
    enabled: boolean;
    color?: string;
    blur?: number;
    offsetX?: number;
    offsetY?: number;
  };
  orientation?: 'portrait' | 'landscape';
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  format?: 'png' | 'jpg' | 'pdf';
  dimensions?: {
    width: number;
    height: number;
    dpi?: number;
  };
}

export interface TextCustomization {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontStyle?: 'normal' | 'italic' | 'oblique';
  color?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
  textShadow?: {
    color: string;
    offsetX: number;
    offsetY: number;
    blur: number;
  };
  gradient?: {
    type: 'linear' | 'radial';
    colors: string[];
    direction?: number;
  };
  stroke?: {
    color: string;
    width: number;
  };
  transform?: {
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    skewX?: number;
    skewY?: number;
  };
}

export interface ImageCustomization {
  filter?: 'none' | 'blur' | 'brightness' | 'contrast' | 'grayscale' | 'sepia' | 'invert';
  opacity?: number;
  borderRadius?: number;
  border?: {
    width: number;
    color: string;
    style: 'solid' | 'dashed' | 'dotted';
  };
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  transform?: {
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    flipX?: boolean;
    flipY?: boolean;
  };
}

export interface LayerCustomization {
  id: number;
  type: 'text' | 'image' | 'shape' | 'qr' | 'barcode';
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  visible: boolean;
  content?: string;
  imageUrl?: string;
  textCustomization?: TextCustomization;
  imageCustomization?: ImageCustomization;
  shapeProperties?: {
    type: 'rectangle' | 'circle' | 'line' | 'polygon';
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  };
}

export class AdvancedCertificateGenerator {
  private canvas: any;
  private ctx!: CanvasRenderingContext2D;
  private template: Template;
  private customizations: CustomizationOptions;
  private layers: LayerCustomization[] = [];

  constructor(template: Template, customizations: CustomizationOptions = {}) {
    this.template = template;
    this.customizations = customizations;
  }

  private getDimensions(): { width: number; height: number } {
    if (this.customizations.dimensions) {
      return this.customizations.dimensions;
    }

    const settings = this.template.settings as Record<string, any> || {};
    const orientation = this.customizations.orientation || settings.orientation || 'portrait';
    
    // Default certificate dimensions (A4 in pixels at 300 DPI)
    const baseWidth = 2480;
    const baseHeight = 3508;
    
    if (orientation === 'landscape') {
      return { width: baseHeight, height: baseWidth };
    }
    
    return { width: baseWidth, height: baseHeight };
  }

  private getQualityMultiplier(): number {
    switch (this.customizations.quality) {
      case 'low': return 0.5;
      case 'medium': return 1;
      case 'high': return 1.5;
      case 'ultra': return 2;
      default: return 1;
    }
  }

  private async initializeCanvas(): Promise<void> {
    const dimensions = this.getDimensions();
    const qualityMultiplier = this.getQualityMultiplier();
    
    const width = Math.round(dimensions.width * qualityMultiplier);
    const height = Math.round(dimensions.height * qualityMultiplier);
    
    this.canvas = createCanvas(width, height);
    this.ctx = this.canvas.getContext('2d');
    
    // Set high-quality rendering
    this.ctx.imageSmoothingEnabled = true;
    // @ts-ignore - imageSmoothingQuality is available in newer Canvas versions
    if ('imageSmoothingQuality' in this.ctx) {
      this.ctx.imageSmoothingQuality = 'high';
    }
    this.ctx.textBaseline = 'top';
  }

  private drawBackground(): void {
    const { width, height } = this.canvas;
    
    if (this.customizations.backgroundColor) {
      this.ctx.fillStyle = this.customizations.backgroundColor;
      this.ctx.fillRect(0, 0, width, height);
    }
    
    // Apply shadow if enabled
    if (this.customizations.shadow?.enabled) {
      this.ctx.shadowColor = this.customizations.shadow.color || '#000000';
      this.ctx.shadowBlur = this.customizations.shadow.blur || 10;
      this.ctx.shadowOffsetX = this.customizations.shadow.offsetX || 5;
      this.ctx.shadowOffsetY = this.customizations.shadow.offsetY || 5;
    }
  }

  private async drawTemplateImage(): Promise<void> {
    try {
      const imageUrl = this.template.imageUrl.startsWith('http') 
        ? this.template.imageUrl 
        : path.join(process.cwd(), this.template.imageUrl.replace(/^\//, ''));
      
      const templateImage = await loadImage(imageUrl);
      const { width, height } = this.canvas;
      
      this.ctx.drawImage(templateImage, 0, 0, width, height);
    } catch (error) {
      console.error('Error loading template image:', error);
    }
  }

  private drawBorder(): void {
    if (this.customizations.borderStyle && this.customizations.borderStyle !== 'none') {
      const { width, height } = this.canvas;
      const borderWidth = this.customizations.borderWidth || 2;
      const borderColor = this.customizations.borderColor || '#000000';
      
      this.ctx.strokeStyle = borderColor;
      this.ctx.lineWidth = borderWidth;
      
      // Set line dash pattern based on border style
      switch (this.customizations.borderStyle) {
        case 'dashed':
          this.ctx.setLineDash([10, 5]);
          break;
        case 'dotted':
          this.ctx.setLineDash([2, 2]);
          break;
        case 'double':
          // Draw outer border
          this.ctx.strokeRect(borderWidth / 2, borderWidth / 2, width - borderWidth, height - borderWidth);
          // Draw inner border
          this.ctx.strokeRect(borderWidth * 2, borderWidth * 2, width - borderWidth * 4, height - borderWidth * 4);
          return;
        default:
          this.ctx.setLineDash([]);
      }
      
      this.ctx.strokeRect(borderWidth / 2, borderWidth / 2, width - borderWidth, height - borderWidth);
      this.ctx.setLineDash([]);
    }
  }

  private applyTextCustomization(text: string, customization: TextCustomization, x: number, y: number): void {
    this.ctx.save();
    
    // Apply transform if specified
    if (customization.transform) {
      this.ctx.translate(x, y);
      if (customization.transform.rotation) {
        this.ctx.rotate(customization.transform.rotation * Math.PI / 180);
      }
      if (customization.transform.scaleX || customization.transform.scaleY) {
        this.ctx.scale(
          customization.transform.scaleX || 1,
          customization.transform.scaleY || 1
        );
      }
      x = 0;
      y = 0;
    }
    
    // Set font properties
    const fontSize = customization.fontSize || 24;
    const fontWeight = customization.fontWeight || 'normal';
    const fontFamily = customization.fontFamily || 'Cairo, Arial, sans-serif';
    const fontStyle = customization.fontStyle || 'normal';
    
    this.ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    const textAlign = customization.textAlign || 'center';
    this.ctx.textAlign = textAlign === 'justify' ? 'center' : textAlign as CanvasTextAlign;
    
    // Apply text shadow
    if (customization.textShadow) {
      this.ctx.shadowColor = customization.textShadow.color;
      this.ctx.shadowBlur = customization.textShadow.blur;
      this.ctx.shadowOffsetX = customization.textShadow.offsetX;
      this.ctx.shadowOffsetY = customization.textShadow.offsetY;
    }
    
    // Apply gradient or solid color
    if (customization.gradient) {
      const gradient = customization.gradient.type === 'linear' 
        ? this.ctx.createLinearGradient(x - 100, y, x + 100, y)
        : this.ctx.createRadialGradient(x, y, 0, x, y, 100);
      
      customization.gradient.colors.forEach((color, index) => {
        gradient.addColorStop(index / (customization.gradient!.colors.length - 1), color);
      });
      
      this.ctx.fillStyle = gradient;
    } else {
      this.ctx.fillStyle = customization.color || '#000000';
    }
    
    // Draw stroke if specified
    if (customization.stroke) {
      this.ctx.strokeStyle = customization.stroke.color;
      this.ctx.lineWidth = customization.stroke.width;
      this.ctx.strokeText(text, x, y);
    }
    
    // Draw the text
    this.ctx.fillText(text, x, y);
    
    this.ctx.restore();
  }

  private async drawImage(imageUrl: string, x: number, y: number, width: number, height: number, customization?: ImageCustomization): Promise<void> {
    try {
      const image = await loadImage(imageUrl);
      
      this.ctx.save();
      
      if (customization?.transform) {
        this.ctx.translate(x + width / 2, y + height / 2);
        
        if (customization.transform.rotation) {
          this.ctx.rotate(customization.transform.rotation * Math.PI / 180);
        }
        
        if (customization.transform.scaleX || customization.transform.scaleY) {
          this.ctx.scale(
            customization.transform.scaleX || 1,
            customization.transform.scaleY || 1
          );
        }
        
        if (customization.transform.flipX) {
          this.ctx.scale(-1, 1);
        }
        
        if (customization.transform.flipY) {
          this.ctx.scale(1, -1);
        }
        
        x = -width / 2;
        y = -height / 2;
      }
      
      // Apply filters and effects
      if (customization?.opacity && customization.opacity < 1) {
        this.ctx.globalAlpha = customization.opacity;
      }
      
      // Apply shadow
      if (customization?.shadow) {
        this.ctx.shadowColor = customization.shadow.color;
        this.ctx.shadowBlur = customization.shadow.blur;
        this.ctx.shadowOffsetX = customization.shadow.offsetX;
        this.ctx.shadowOffsetY = customization.shadow.offsetY;
      }
      
      // Draw border radius if specified
      if (customization?.borderRadius) {
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, width, height, customization.borderRadius);
        this.ctx.clip();
      }
      
      this.ctx.drawImage(image, x, y, width, height);
      
      // Draw border if specified
      if (customization?.border) {
        this.ctx.strokeStyle = customization.border.color;
        this.ctx.lineWidth = customization.border.width;
        
        if (customization.border.style === 'dashed') {
          this.ctx.setLineDash([5, 5]);
        } else if (customization.border.style === 'dotted') {
          this.ctx.setLineDash([2, 2]);
        }
        
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.setLineDash([]);
      }
      
      this.ctx.restore();
    } catch (error) {
      console.error('Error drawing image:', error);
    }
  }

  private drawShape(layer: LayerCustomization): void {
    if (!layer.shapeProperties) return;
    
    const { x, y } = layer.position;
    const { width, height } = layer.size;
    const props = layer.shapeProperties;
    
    this.ctx.save();
    
    if (props.fillColor) {
      this.ctx.fillStyle = props.fillColor;
    }
    
    if (props.strokeColor) {
      this.ctx.strokeStyle = props.strokeColor;
      this.ctx.lineWidth = props.strokeWidth || 1;
    }
    
    switch (props.type) {
      case 'rectangle':
        if (props.fillColor) this.ctx.fillRect(x, y, width, height);
        if (props.strokeColor) this.ctx.strokeRect(x, y, width, height);
        break;
        
      case 'circle':
        this.ctx.beginPath();
        this.ctx.arc(x + width / 2, y + height / 2, Math.min(width, height) / 2, 0, 2 * Math.PI);
        if (props.fillColor) this.ctx.fill();
        if (props.strokeColor) this.ctx.stroke();
        break;
        
      case 'line':
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + width, y + height);
        if (props.strokeColor) this.ctx.stroke();
        break;
    }
    
    this.ctx.restore();
  }

  private async drawLayers(formData: any): Promise<void> {
    // Sort layers by zIndex
    const sortedLayers = [...this.layers].sort((a, b) => a.zIndex - b.zIndex);
    
    for (const layer of sortedLayers) {
      if (!layer.visible) continue;
      
      switch (layer.type) {
        case 'text':
          if (layer.content && layer.textCustomization) {
            // Replace placeholders with form data
            let text = layer.content;
            Object.keys(formData).forEach(key => {
              text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), formData[key] || '');
            });
            
            this.applyTextCustomization(
              text,
              layer.textCustomization,
              layer.position.x,
              layer.position.y
            );
          }
          break;
          
        case 'image':
          if (layer.imageUrl) {
            await this.drawImage(
              layer.imageUrl,
              layer.position.x,
              layer.position.y,
              layer.size.width,
              layer.size.height,
              layer.imageCustomization
            );
          }
          break;
          
        case 'shape':
          this.drawShape(layer);
          break;
      }
    }
  }

  private drawWatermark(): void {
    if (!this.customizations.watermark) return;
    
    const watermark = this.customizations.watermark;
    const { width, height } = this.canvas;
    
    this.ctx.save();
    this.ctx.globalAlpha = watermark.opacity || 0.3;
    
    if (watermark.text) {
      this.ctx.font = `${watermark.size || 24}px Arial`;
      this.ctx.fillStyle = '#666666';
      
      let x, y;
      switch (watermark.position) {
        case 'top-left':
          x = 20;
          y = 40;
          break;
        case 'top-right':
          x = width - 20;
          y = 40;
          this.ctx.textAlign = 'right';
          break;
        case 'bottom-left':
          x = 20;
          y = height - 20;
          break;
        case 'bottom-right':
          x = width - 20;
          y = height - 20;
          this.ctx.textAlign = 'right';
          break;
        default:
          x = width / 2;
          y = height / 2;
          this.ctx.textAlign = 'center';
      }
      
      this.ctx.fillText(watermark.text, x, y);
    }
    
    this.ctx.restore();
  }

  public addLayer(layer: LayerCustomization): void {
    this.layers.push(layer);
  }

  public removeLayer(layerId: number): void {
    this.layers = this.layers.filter(layer => layer.id !== layerId);
  }

  public updateLayer(layerId: number, updates: Partial<LayerCustomization>): void {
    const layerIndex = this.layers.findIndex(layer => layer.id === layerId);
    if (layerIndex !== -1) {
      this.layers[layerIndex] = { ...this.layers[layerIndex], ...updates };
    }
  }

  public async generateCertificate(formData: any): Promise<string> {
    await this.initializeCanvas();
    
    // Draw background
    this.drawBackground();
    
    // Draw template image
    await this.drawTemplateImage();
    
    // Draw custom layers
    await this.drawLayers(formData);
    
    // Draw border
    this.drawBorder();
    
    // Draw watermark
    this.drawWatermark();
    
    // Generate output file
    const outputDir = path.join(process.cwd(), 'uploads', 'certificates');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = `certificate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const format = this.customizations.format || 'png';
    const outputPath = path.join(outputDir, `${filename}.${format}`);
    
    // Save the image
    if (format === 'jpg') {
      const buffer = this.canvas.toBuffer('image/jpeg', { quality: 0.95 });
      fs.writeFileSync(outputPath, buffer);
    } else {
      const buffer = this.canvas.toBuffer('image/png');
      fs.writeFileSync(outputPath, buffer);
    }
    
    return outputPath;
  }
}

// Helper function to create a generator with template data
export async function createAdvancedGenerator(
  templateId: number, 
  customizations: CustomizationOptions = {}
): Promise<AdvancedCertificateGenerator> {
  const template = await db.query.templates.findFirst({
    where: eq(templates.id, templateId)
  });
  
  if (!template) {
    throw new Error('Template not found');
  }
  
  return new AdvancedCertificateGenerator(template, customizations);
}