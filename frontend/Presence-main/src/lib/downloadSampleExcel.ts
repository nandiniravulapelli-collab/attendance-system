import { apiUrl } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

/**
 * GET a sample .xlsx from the API (session cookie) and trigger a browser download.
 */
export async function downloadSampleExcel(apiPath: string, fallbackFilename: string): Promise<void> {
  try {
    const res = await fetch(apiUrl(apiPath), { method: 'GET', credentials: 'include' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg =
        (data && (typeof data.detail === 'string' ? data.detail : data.error)) ||
        'Could not download sample file.';
      toast({ title: 'Download failed', description: String(msg), variant: 'destructive' });
      return;
    }
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition');
    let filename = fallbackFilename;
    if (cd) {
      const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(cd) || /filename="([^"]+)"/i.exec(cd);
      if (m) filename = decodeURIComponent(m[1].trim());
    }
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toast({
      title: 'Sample file downloaded',
      description: 'Open the workbook to see required columns and example rows.',
    });
  } catch {
    toast({ title: 'Download failed', description: 'Network error.', variant: 'destructive' });
  }
}
