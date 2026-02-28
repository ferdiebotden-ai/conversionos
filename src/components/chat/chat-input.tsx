'use client';

/**
 * Chat Input
 * Input field with image attachment button and TalkButton for voice
 * Fixed at bottom for thumb zone accessibility on mobile
 */

import { useState, useRef, type KeyboardEvent, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ImagePlus, Send, X } from 'lucide-react';
import { TalkButton } from '@/components/voice/talk-button';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string, images: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = 'Type your message...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() || images.length > 0) {
      onSend(message.trim(), images);
      setMessage('');
      setImages([]);
      setImagePreviews([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
      return validTypes.includes(file.type);
    });

    const newImages = [...images, ...validFiles].slice(0, 3);
    setImages(newImages);

    const newPreviews = newImages.map(file => URL.createObjectURL(file));
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setImagePreviews(newPreviews);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    const preview = imagePreviews[index];
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const canAttachMore = images.length < 3;

  return (
    <div className="border-t border-border bg-background p-4">
      {/* Image previews */}
      {imagePreviews.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="relative shrink-0">
              <div className="relative h-16 w-16 rounded-lg overflow-hidden border border-border">
                <Image
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                aria-label={`Remove image ${index + 1}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Image upload button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/heif"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || !canAttachMore}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || !canAttachMore}
          className={cn(
            'h-10 w-10 shrink-0',
            !canAttachMore && 'opacity-50'
          )}
          aria-label="Attach image"
        >
          <ImagePlus className="h-5 w-5" />
        </Button>

        {/* Text input */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="min-h-[40px] max-h-[120px] resize-none py-2.5"
          data-testid="chat-input"
        />

        {/* Talk to Emma button */}
        <TalkButton
          context="estimate"
          variant="inline"
          disabled={disabled}
        />

        {/* Send button */}
        <Button
          type="button"
          onClick={handleSend}
          disabled={disabled || (!message.trim() && images.length === 0)}
          size="icon"
          className="h-10 w-10 shrink-0"
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>

      {/* Helper text — adaptive for desktop vs mobile */}
      <p className="text-xs text-muted-foreground mt-2">
        <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
        <span className="sm:hidden">Tap send to message Emma</span>
        {canAttachMore && images.length > 0 && ` • ${3 - images.length} more image${3 - images.length !== 1 ? 's' : ''} allowed`}
      </p>
    </div>
  );
}
