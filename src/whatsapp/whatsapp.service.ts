import { Injectable } from '@nestjs/common';

@Injectable()
export class WhatsAppService {
  /**
   * Generate WhatsApp link with pre-filled message
   */
  generateWhatsAppLink(phoneNumber: string, message: string): string {
    // Remove any non-digit characters except +
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
    
    // Ensure phone starts with country code (if not, assume it's local)
    // For UK numbers, ensure they start with +44
    let formattedPhone = cleanPhone;
    if (!formattedPhone.startsWith('+')) {
      // If it starts with 0, replace with +44
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+44' + formattedPhone.substring(1);
      } else {
        // Assume it's already a country code format
        formattedPhone = '+' + formattedPhone;
      }
    }

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Generate WhatsApp link
    return `https://wa.me/${formattedPhone.replace(/\+/g, '')}?text=${encodedMessage}`;
  }

  /**
   * Generate invoice WhatsApp message
   */
  generateInvoiceMessage(invoice: any): string {
    const business = invoice.business;
    const client = invoice.client;
    const job = invoice.job;
    
    let message = `📄 *Invoice ${invoice.invoiceNumber}*\n\n`;
    message += `Hello ${client.name},\n\n`;
    message += `Your invoice is ready:\n\n`;
    message += `*Amount:* £${Number(invoice.amount).toFixed(2)}\n`;
    
    if (Number(invoice.vatAmount) > 0) {
      message += `*VAT:* £${Number(invoice.vatAmount).toFixed(2)}\n`;
    }
    
    message += `*Total:* £${Number(invoice.totalAmount).toFixed(2)}\n\n`;
    message += `*Due Date:* ${new Date(invoice.dueDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}\n`;
    
    if (job) {
      message += `*Service:* ${job.type.replace('_', ' ')} - ${new Date(job.scheduledDate).toLocaleDateString('en-GB')}\n`;
    }
    
    message += `\n*Status:* ${invoice.status === 'PAID' ? '✅ Paid' : '⏳ Unpaid'}\n\n`;
    
    if (invoice.status === 'UNPAID') {
      message += `Please arrange payment at your earliest convenience.\n\n`;
    }
    
    message += `Thank you for your business!\n`;
    message += `\n${business.name}`;
    if (business.phone) {
      message += `\n📞 ${business.phone}`;
    }
    
    return message;
  }

  /**
   * Generate job photos WhatsApp message
   */
  generateJobPhotosMessage(job: any, photoType: 'BEFORE' | 'AFTER' | 'ALL'): string {
    const business = job.business;
    const client = job.client;
    
    let message = '';
    
    if (photoType === 'BEFORE') {
      message = `📸 *Before Photos - Job Update*\n\n`;
      message += `Hello ${client.name},\n\n`;
      message += `Here are the before photos from your cleaning job:\n\n`;
      message += `*Job Date:* ${new Date(job.scheduledDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}\n`;
      if (job.scheduledTime) {
        message += `*Time:* ${job.scheduledTime}\n`;
      }
    } else if (photoType === 'AFTER') {
      message = `✨ *After Photos - Job Complete*\n\n`;
      message += `Hello ${client.name},\n\n`;
      message += `Your cleaning job is complete! Here are the after photos:\n\n`;
      message += `*Job Date:* ${new Date(job.scheduledDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}\n`;
      if (job.scheduledTime) {
        message += `*Time:* ${job.scheduledTime}\n`;
      }
      message += `\n✅ Job completed successfully!\n`;
    } else {
      message = `📸 *Job Photos*\n\n`;
      message += `Hello ${client.name},\n\n`;
      message += `Here are the photos from your cleaning job:\n\n`;
      message += `*Job Date:* ${new Date(job.scheduledDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}\n`;
      if (job.scheduledTime) {
        message += `*Time:* ${job.scheduledTime}\n`;
      }
    }
    
    // Add photo URLs
    const photos = job.photos || [];
    const relevantPhotos = photoType === 'ALL' 
      ? photos 
      : photos.filter((p: any) => p.photoType === photoType);
    
    if (relevantPhotos.length > 0) {
      message += `\n*Photos:*\n`;
      relevantPhotos.forEach((photo: any, index: number) => {
        message += `${index + 1}. ${photo.imageUrl}\n`;
      });
      message += `\n`;
    }
    
    message += `\nThank you for choosing ${business.name}!`;
    if (business.phone) {
      message += `\n📞 ${business.phone}`;
    }
    
    return message;
  }

  /**
   * Generate job completion WhatsApp message with photos
   */
  generateJobCompletionMessage(job: any): string {
    const business = job.business;
    const client = job.client;
    
    let message = `✨ *Job Completed*\n\n`;
    message += `Hello ${client.name},\n\n`;
    message += `Your cleaning job has been completed!\n\n`;
    message += `*Job Details:*\n`;
    message += `• Date: ${new Date(job.scheduledDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}\n`;
    if (job.scheduledTime) {
      message += `• Time: ${job.scheduledTime}\n`;
    }
    message += `• Type: ${job.type.replace('_', ' ')}\n`;
    message += `• Status: ✅ Completed\n\n`;
    
    // Add checklist completion if available
    if (job.checklist && job.checklist.length > 0) {
      const completed = job.checklist.filter((item: any) => item.completed).length;
      message += `*Checklist:* ${completed}/${job.checklist.length} items completed\n\n`;
    }
    
    // Add photos info
    const photos = job.photos || [];
    if (photos.length > 0) {
      const beforePhotos = photos.filter((p: any) => p.photoType === 'BEFORE');
      const afterPhotos = photos.filter((p: any) => p.photoType === 'AFTER');
      
      if (beforePhotos.length > 0) {
        message += `📸 Before photos: ${beforePhotos.length}\n`;
      }
      if (afterPhotos.length > 0) {
        message += `✨ After photos: ${afterPhotos.length}\n`;
      }
      message += `\n`;
    }
    
    message += `Thank you for choosing ${business.name}!\n`;
    if (business.phone) {
      message += `📞 ${business.phone}`;
    }
    
    return message;
  }
}

