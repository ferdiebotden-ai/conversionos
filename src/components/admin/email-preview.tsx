'use client';

/**
 * Email Preview Component
 * Renders a preview of the email that will be sent to the customer
 * Shows both desktop and mobile views
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Monitor, Smartphone, Mail, Paperclip } from 'lucide-react';
import { useBranding } from '@/components/branding-provider';

interface EmailPreviewProps {
  subject: string;
  body: string;
  recipientEmail: string;
  recipientName: string;
  senderName?: string;
  senderEmail?: string;
  companyName?: string;
  quoteTotal?: number;
  depositRequired?: number;
  className?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Convert plain text email to HTML with basic formatting
function textToHtml(text: string): string {
  // Escape HTML
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Convert line breaks to <br>
  html = html.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');

  // Make URLs clickable
  html = html.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color: #1565C0;">$1</a>'
  );

  // Make email addresses clickable
  html = html.replace(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    '<a href="mailto:$1" style="color: #1565C0;">$1</a>'
  );

  // Make phone numbers clickable
  html = html.replace(
    /(\(\d{3}\)\s?\d{3}[-.]?\d{4}|\d{3}[-.]?\d{3}[-.]?\d{4})/g,
    '<a href="tel:$1" style="color: #1565C0;">$1</a>'
  );

  // Bold text between ** **
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  return `<p>${html}</p>`;
}

export function EmailPreview({
  subject,
  body,
  recipientEmail,
  recipientName,
  senderName,
  senderEmail,
  companyName,
  quoteTotal,
  depositRequired,
  className,
}: EmailPreviewProps) {
  const branding = useBranding();
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const resolvedSenderName = senderName ?? branding.name;
  const resolvedSenderEmail = senderEmail ?? branding.email;
  const resolvedCompanyName = companyName ?? branding.name;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="center" style="padding: 20px 10px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background-color: #1565C0; padding: 24px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                    ${resolvedCompanyName}
                  </h1>
                  <p style="margin: 4px 0 0 0; color: #ffffff; opacity: 0.9; font-size: 14px;">
                    ${branding.tagline} in ${branding.city}, ${branding.province}
                  </p>
                </td>
              </tr>

              <!-- Main content -->
              <tr>
                <td style="padding: 30px;">
                  <div style="color: #333333; font-size: 16px; line-height: 1.6;">
                    ${textToHtml(body)}
                  </div>

                  ${quoteTotal ? `
                  <!-- Quote summary box -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0; background-color: #f9f9f9; border-radius: 8px; border: 1px solid #e0e0e0;">
                    <tr>
                      <td style="padding: 20px;">
                        <h3 style="margin: 0 0 12px 0; color: #333333; font-size: 16px;">Quote Summary</h3>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                            <td style="padding: 8px 0; color: #666666;">Total Amount</td>
                            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333333;">${formatCurrency(quoteTotal)}</td>
                          </tr>
                          ${depositRequired ? `
                          <tr>
                            <td style="padding: 8px 0; border-top: 1px solid #e0e0e0; color: #1565C0; font-weight: 500;">Deposit Required (15%)</td>
                            <td style="padding: 8px 0; border-top: 1px solid #e0e0e0; text-align: right; font-weight: bold; color: #1565C0;">${formatCurrency(depositRequired)}</td>
                          </tr>
                          ` : ''}
                        </table>
                      </td>
                    </tr>
                  </table>
                  ` : ''}

                  <!-- Attachment note -->
                  <p style="margin: 20px 0 0 0; padding: 12px 16px; background-color: #fff8e1; border-left: 4px solid #ffc107; color: #856404; font-size: 14px; border-radius: 0 4px 4px 0;">
                    <strong>Attachment:</strong> Your detailed quote is attached as a PDF document.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f4f4f4; padding: 24px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                  <p style="margin: 0; color: #666666; font-size: 14px;">
                    <strong>${resolvedCompanyName}</strong><br>
                    ${branding.city}, ${branding.province}<br>
                    <a href="mailto:${resolvedSenderEmail}" style="color: #1565C0; text-decoration: none;">${resolvedSenderEmail}</a>
                  </p>
                  <p style="margin: 16px 0 0 0; color: #999999; font-size: 12px;">
                    © ${new Date().getFullYear()} ${resolvedCompanyName}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return (
    <div className={cn('space-y-4', className)}>
      {/* View mode toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Email Preview</h3>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === 'desktop' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('desktop')}
            className="h-8 px-3"
          >
            <Monitor className="h-4 w-4 mr-1.5" />
            Desktop
          </Button>
          <Button
            variant={viewMode === 'mobile' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('mobile')}
            className="h-8 px-3"
          >
            <Smartphone className="h-4 w-4 mr-1.5" />
            Mobile
          </Button>
        </div>
      </div>

      {/* Email client header */}
      <Card>
        <CardHeader className="py-3 px-4 border-b bg-muted/30">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">From:</span>
                <span className="font-medium">{resolvedSenderName} &lt;{resolvedSenderEmail}&gt;</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">To:</span>
                <span className="font-medium">{recipientName} &lt;{recipientEmail}&gt;</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Subject:</span>
                <span className="font-medium">{subject}</span>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              <Paperclip className="h-3 w-3 mr-1" />
              PDF Attached
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div
            className={cn(
              'bg-gray-100 p-4 transition-all',
              viewMode === 'mobile' ? 'max-w-[375px] mx-auto' : ''
            )}
          >
            <iframe
              srcDoc={emailHtml}
              className={cn(
                'w-full border-0 bg-white rounded shadow-sm',
                viewMode === 'desktop' ? 'h-[500px]' : 'h-[600px]'
              )}
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        This is a preview of how your email will appear to the recipient
      </p>
    </div>
  );
}
