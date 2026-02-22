"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  contactFormSchema,
  projectTypeLabels,
  type ContactFormData,
} from "@/lib/schemas/contact"
import { Loader2, CheckCircle } from "lucide-react"
import { useBranding } from "@/components/branding-provider"

type FormErrors = Partial<Record<keyof ContactFormData, string[]>>

interface FormState {
  name: string
  email: string
  phone: string
  projectType: ContactFormData["projectType"] | ""
  message: string
}

const initialFormState: FormState = {
  name: "",
  email: "",
  phone: "",
  projectType: "",
  message: "",
}

export function ContactForm() {
  const branding = useBranding()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSubmitted, setIsSubmitted] = React.useState(false)
  const [errors, setErrors] = React.useState<FormErrors>({})
  const [formData, setFormData] = React.useState<FormState>(initialFormState)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Convert empty projectType to undefined for validation
    const dataToValidate = {
      ...formData,
      projectType: formData.projectType || undefined,
    }
    const result = contactFormSchema.safeParse(dataToValidate)

    if (!result.success) {
      const fieldErrors: FormErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ContactFormData
        if (!fieldErrors[field]) {
          fieldErrors[field] = []
        }
        fieldErrors[field]?.push(issue.message)
      }
      setErrors(fieldErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: result.data.name,
          email: result.data.email,
          phone: result.data.phone || undefined,
          projectType: result.data.projectType,
          goalsText: result.data.message,
        }),
      })

      if (!response.ok) {
        throw new Error("Submission failed")
      }

      setIsSubmitted(true)
    } catch {
      setErrors({ message: [`Something went wrong. Please try again or call us directly at ${branding.phone}.`] })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (
    field: keyof FormState,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/30 p-8 text-center">
        <CheckCircle className="size-12 text-green-600" />
        <h3 className="mt-4 text-xl font-semibold text-foreground">
          Message Sent!
        </h3>
        <p className="mt-2 text-muted-foreground">
          Thank you for reaching out. We&apos;ll get back to you within 24 hours.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setIsSubmitted(false)
            setFormData(initialFormState)
          }}
        >
          Send Another Message
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          type="text"
          placeholder="Your name"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name[0]}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="your@email.com"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          className={errors.email ? "border-destructive" : ""}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email[0]}</p>
        )}
      </div>

      {/* Phone (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="phone">Phone (Optional)</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="(519) 555-1234"
          value={formData.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          className={errors.phone ? "border-destructive" : ""}
        />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone[0]}</p>
        )}
      </div>

      {/* Project Type */}
      <div className="space-y-2">
        <Label htmlFor="projectType">
          Project Type <span className="text-destructive">*</span>
        </Label>
        <Select
          value={formData.projectType}
          onValueChange={(value) => handleChange("projectType", value)}
        >
          <SelectTrigger
            id="projectType"
            className={errors.projectType ? "border-destructive" : ""}
          >
            <SelectValue placeholder="Select a project type" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(projectTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.projectType && (
          <p className="text-sm text-destructive">{errors.projectType[0]}</p>
        )}
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label htmlFor="message">
          Message <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="message"
          placeholder="Tell us about your project..."
          rows={5}
          value={formData.message}
          onChange={(e) => handleChange("message", e.target.value)}
          className={errors.message ? "border-destructive" : ""}
        />
        {errors.message && (
          <p className="text-sm text-destructive">{errors.message[0]}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        className="h-12 w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Sending...
          </>
        ) : (
          "Send Message"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        We typically respond within 24 hours.
      </p>
    </form>
  )
}
