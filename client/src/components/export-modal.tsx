import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileArchive, Copy, Check, Loader2 } from "lucide-react";
import type { Variation } from "@shared/schema";

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variations: Variation[];
  projectName: string;
}

export interface ExportOptions {
  format: 'original' | 'png' | 'jpg' | 'webp';
  namingTemplate: string;
  downloadType: 'individual' | 'zip';
}

const namingTokens = [
  { token: '{project}', description: 'Project name' },
  { token: '{platform}', description: 'Platform (meta, tiktok, etc.)' },
  { token: '{size}', description: 'Size name' },
  { token: '{dimensions}', description: 'Width x Height' },
  { token: '{variation}', description: 'Variation number' },
  { token: '{date}', description: 'Date (YYYY-MM-DD)' },
];

// Helper to generate filename from template
function generateFilename(
  template: string,
  variation: Variation,
  projectName: string,
  format: ExportOptions['format']
): string {
  const filename = template
    .replace('{project}', projectName.toLowerCase().replace(/\s+/g, '_'))
    .replace('{platform}', variation.sizeConfig.platform)
    .replace('{size}', variation.sizeConfig.name.toLowerCase().replace(/\s+/g, '_'))
    .replace('{dimensions}', `${variation.sizeConfig.width}x${variation.sizeConfig.height}`)
    .replace('{variation}', String(variation.variationIndex + 1).padStart(2, '0'))
    .replace('{date}', new Date().toISOString().split('T')[0]);

  const ext = format === 'original' ? (variation.type === 'video' ? 'mp4' : 'png') : format;
  return `${filename}.${ext}`;
}

// Download a single file
async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error(`Failed to download ${filename}:`, error);
    // Fallback: open in new tab
    window.open(url, '_blank');
  }
}

export function ExportModal({
  open,
  onOpenChange,
  variations,
  projectName,
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportOptions['format']>('original');
  const [namingTemplate, setNamingTemplate] = useState('{project}_{platform}_{size}_v{variation}');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');

  const generatePreviewFilenames = () => {
    return variations.slice(0, 3).map((v) => generateFilename(namingTemplate, v, projectName, format));
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      for (let i = 0; i < variations.length; i++) {
        const variation = variations[i];
        const filename = generateFilename(namingTemplate, variation, projectName, format);

        setCurrentFile(filename);
        setExportProgress(Math.round((i / variations.length) * 100));

        await downloadFile(variation.url, filename);

        // Small delay between downloads to prevent browser blocking
        if (i < variations.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setExportProgress(100);

      // Close modal after a brief moment
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setCurrentFile('');
        onOpenChange(false);
      }, 1000);
    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
      setExportProgress(0);
      setCurrentFile('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Export Variations
          </DialogTitle>
          <DialogDescription>
            Download {variations.length} variation{variations.length !== 1 ? 's' : ''} to your computer.
          </DialogDescription>
        </DialogHeader>

        {isExporting ? (
          <div className="py-8 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm font-medium mb-1">Downloading files...</p>
                <p className="text-xs text-muted-foreground font-mono truncate max-w-[300px]">
                  {currentFile}
                </p>
              </div>
            </div>
            <Progress value={exportProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {Math.round(exportProgress)}% complete
            </p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ExportOptions['format'])}>
                <SelectTrigger data-testid="select-export-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Original Format</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="jpg">JPG</SelectItem>
                  <SelectItem value="webp">WebP</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Files will be downloaded individually to your Downloads folder.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Naming Convention</Label>
              <Input
                value={namingTemplate}
                onChange={(e) => setNamingTemplate(e.target.value)}
                className="font-mono text-sm"
                data-testid="input-naming-template"
              />
              <div className="flex flex-wrap gap-1.5">
                {namingTokens.map((t) => (
                  <Button
                    key={t.token}
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs font-mono gap-1"
                    onClick={() => handleCopyToken(t.token)}
                    data-testid={`button-token-${t.token.replace(/[{}]/g, '')}`}
                  >
                    {copiedToken === t.token ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {t.token}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Preview filenames</Label>
              <ScrollArea className="h-[80px] rounded-md border bg-muted/30 p-3">
                <div className="space-y-1.5">
                  {generatePreviewFilenames().map((filename, i) => (
                    <p key={i} className="font-mono text-xs text-muted-foreground">
                      {filename}
                    </p>
                  ))}
                  {variations.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      ... and {variations.length - 3} more
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || variations.length === 0} data-testid="button-confirm-export">
            <Download className="h-4 w-4 mr-2" />
            Download {variations.length} File{variations.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
