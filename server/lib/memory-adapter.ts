/**
 * محاكي في الذاكرة لمحول Drizzle
 * يسمح باستخدام التطبيق بدون اتصال قاعدة بيانات فعلية
 * 
 * هذا مفيد للتطوير المحلي وأغراض العرض التوضيحي
 */

// خريطة لتخزين البيانات في الذاكرة، مستخدمة كقاعدة بيانات بسيطة
const memoryStore = new Map<string, any[]>();

// صانع معرفات فريدة للسجلات الجديدة
let idCounter = 1;

// تصدير دالة إنشاء المحاكي
export function memoryDrizzleAdapter() {
  return {
    /**
     * ينفذ استعلامات الاختيار من قاعدة البيانات
     */
    query: async ({ sql, params = [] }: { sql: string; params?: any[] }) => {
      console.log('[MEMORY_DB] تنفيذ استعلام:', sql);
      
      // تحليل الجدول من الاستعلام
      let tableName = '';
      const match = sql.match(/FROM\s+([^\s]+)/i);
      if (match && match[1]) {
        tableName = match[1].replace(/[\"\[\]`\.']+/g, '');
      }
      
      // التأكد من وجود الجدول
      if (!memoryStore.has(tableName)) {
        memoryStore.set(tableName, []);
      }
      
      // الحصول على البيانات من المخزن
      const tableData = memoryStore.get(tableName) || [];
      
      // التعامل مع استعلامات COUNT
      if (sql.includes('COUNT(*)')) {
        return { rows: [{ count: tableData.length }] };
      }
      
      // محاكاة استعلامات اختيار مختلفة بناءً على النمط
      if (sql.includes('WHERE') && params.length > 0) {
        // محاكاة استعلام بشروط
        const whereMatch = sql.match(/WHERE\s+([^\s]+)\s*=\s*\?/i);
        if (whereMatch && whereMatch[1]) {
          const fieldName = whereMatch[1].replace(/[\"\[\]`\.']+/g, '');
          const value = params[0];
          
          // بحث بسيط عن تطابق
          const results = tableData.filter(row => row[fieldName] === value);
          return { rows: results };
        }
      }
      
      // للاستعلامات البسيطة، نعيد كل الصفوف
      return { rows: tableData };
    },
    
    /**
     * ينفذ استعلامات الإدراج في قاعدة البيانات
     */
    insert: async ({ 
      tableName, 
      values 
    }: { 
      tableName: string; 
      values: Record<string, any>[] 
    }) => {
      console.log(`[MEMORY_DB] إدراج في الجدول ${tableName}:`, values);
      
      // التأكد من وجود الجدول
      if (!memoryStore.has(tableName)) {
        memoryStore.set(tableName, []);
      }
      
      const tableData = memoryStore.get(tableName) || [];
      const insertedRows: any[] = [];
      
      // معالجة كل سجل للإدراج
      values.forEach(value => {
        // إضافة معرف فريد إذا لم يكن موجودًا
        const rowWithId = { 
          ...value, 
          id: value.id || idCounter++, 
          createdAt: value.createdAt || new Date(),
          updatedAt: value.updatedAt || new Date()
        };
        
        // إضافة إلى المخزن
        tableData.push(rowWithId);
        insertedRows.push(rowWithId);
      });
      
      // تحديث المخزن
      memoryStore.set(tableName, tableData);
      
      return { rows: insertedRows };
    },
    
    /**
     * ينفذ استعلامات التحديث في قاعدة البيانات
     */
    update: async ({ 
      tableName, 
      set, 
      where 
    }: { 
      tableName: string; 
      set: Record<string, any>;
      where?: any;
    }) => {
      console.log(`[MEMORY_DB] تحديث الجدول ${tableName}:`, { set, where });
      
      // التأكد من وجود الجدول
      if (!memoryStore.has(tableName)) {
        return { rows: [] };
      }
      
      let tableData = memoryStore.get(tableName) || [];
      const updatedRows: any[] = [];
      
      // محاكاة تحديث بسيط باستخدام معرف
      if (where && where.id) {
        const id = where.id;
        tableData = tableData.map(row => {
          if (row.id === id) {
            const updatedRow = { 
              ...row, 
              ...set, 
              updatedAt: new Date() 
            };
            updatedRows.push(updatedRow);
            return updatedRow;
          }
          return row;
        });
        
        // تحديث المخزن
        memoryStore.set(tableName, tableData);
      }
      
      return { rows: updatedRows };
    },
    
    /**
     * ينفذ استعلامات الحذف من قاعدة البيانات
     */
    delete: async ({ 
      tableName, 
      where 
    }: { 
      tableName: string; 
      where?: any;
    }) => {
      console.log(`[MEMORY_DB] حذف من الجدول ${tableName}:`, where);
      
      // التأكد من وجود الجدول
      if (!memoryStore.has(tableName)) {
        return { rows: [] };
      }
      
      const tableData = memoryStore.get(tableName) || [];
      const deletedRows: any[] = [];
      
      // محاكاة حذف بسيط باستخدام معرف
      if (where && where.id) {
        const id = where.id;
        const rowToDelete = tableData.find(row => row.id === id);
        
        if (rowToDelete) {
          deletedRows.push(rowToDelete);
          
          // تحديث المخزن
          memoryStore.set(tableName, tableData.filter(row => row.id !== id));
        }
      }
      
      return { rows: deletedRows };
    },
    
    /**
     * تنفيذ استعلام SQL مخصص
     */
    execute: async (query: { sql: string; params?: any[] }) => {
      console.log('[MEMORY_DB] تنفيذ SQL مخصص:', query);
      return { rows: [] };
    },
    
    /**
     * تنظيف الموارد، لا يفعل شيئًا في الذاكرة
     */
    cleanup: async () => {
      // لا شيء للتنظيف في محاكي الذاكرة
    }
  };
}

// إضافة بعض البيانات الافتراضية لاختبار نظام المستخدم
memoryStore.set('users', [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$Ftb/e5Sbp/F6zxOFNrHJDu52X.VYOcD32HXxVxWZW3C/KmG/VfLOq', // 700700
    fullName: 'مدير النظام',
    email: 'admin@example.com',
    isAdmin: true,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// إضافة بيانات افتراضية للفئات
memoryStore.set('categories', [
  {
    id: 1,
    name: 'شهادات تقدير',
    slug: 'appreciation',
    description: 'شهادات تقدير متنوعة',
    displayOrder: 1,
    icon: '🏆',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// إضافة بيانات افتراضية للقوالب
memoryStore.set('templates', [
  {
    id: 1,
    title: 'شهادة تقدير نموذجية',
    description: 'قالب شهادة تقدير رسمي',
    categoryId: 1,
    imageUrl: '/static/certificate-template-1.jpg',
    active: true,
    bgColor: '#ffffff',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);