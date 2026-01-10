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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileArchive, Copy, Check } from "lucide-react";
import type { Variation } from "@shared/schema";

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variations: Variation[];
  projectName: string;
  onExport: (options: ExportOptions) => void;
  isExporting: boolean;
  exportProgress: number;
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

export function ExportModal({
  open,
  onOpenChange,
  variations,
  projectName,
  onExport,
  isExporting,
  exportProgress,
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportOptions['format']>('original');
  const [namingTemplate, setNamingTemplate] = useState('{project}_{platform}_{size}_v{variation}');
  const [downloadType, setDownloadType] = useState<ExportOptions['downloadType']>('zip');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const generatePreviewFilenames = () => {
    return variations.slice(0, 3).map((v) => {
      let filename = namingTemplate
        .replace('{project}', projectName.toLowerCase().replace(/\s+/g, '_'))
        .replace('{platform}', v.sizeConfig.platform)
        .replace('{size}', v.sizeConfig.name.toLowerCase().replace(/\s+/g, '_'))
        .replace('{dimensions}', `${v.sizeConfig.width}x${v.sizeConfig.height}`)
        .replace('{variation}', String(v.variationIndex + 1).padStart(2, '0'))
        .replace('{date}', new Date().toISOString().split('T')[0]);
      
      const ext = format === 'original' ? (v.type === 'video' ? 'mp4' : 'png') : format;
      return `${filename}.${ext}`;
    });
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleExport = () => {
    onExport({
      format,
      namingTemplate,
      downloadType,
    });
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
            Configure export settings for {variations.length} variation{variations.length !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        {isExporting ? (
          <div className="py-8 space-y-4">
            <div className="text-center">
              <p className="text-sm font-medium mb-2">Preparing your files...</p>
              <p className="text-xs text-muted-foreground">
                {Math.round(exportProgress)}% complete
              </p>
            </div>
            <Progress value={exportProgress} className="h-2" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
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
              </div>
              
              <div className="space-y-2">
                <Label>Download Type</Label>
                <Select value={downloadType} onValueChange={(v) => setDownloadType(v as ExportOptions['downloadType'])}>
                  <SelectTrigger data-testid="select-download-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zip">ZIP Archive</SelectItem>
                    <SelectItem value="individual">Individual Files</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <Label className="text-xs text-muted-foreground">Preview</Label>
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
          <Button onClick={handleExport} disabled={isExporting} data-testid="button-confirm-export">
            <Download className="h-4 w-4 mr-2" />
            Export {variations.length} File{variations.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
