import { z } from "zod"

export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  email: z
    .string()
    .email("Please enter a valid email address"),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[\d\s\-()+ ]{10,20}$/.test(val),
      "Please enter a valid phone number"
    ),
  projectType: z.enum(
    ["kitchen", "bathroom", "basement", "flooring", "other", "living_room", "bedroom", "dining_room", "painting", "exterior"],
    { message: "Please select a project type" }
  ),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be less than 2000 characters"),
})

export type ContactFormData = z.infer<typeof contactFormSchema>

export const projectTypeLabels: Record<ContactFormData["projectType"], string> = {
  kitchen: "Kitchen Renovation",
  bathroom: "Bathroom Renovation",
  basement: "Basement Finishing",
  flooring: "Flooring",
  other: "Other / General Inquiry",
  living_room: "Living Room",
  bedroom: "Bedroom",
  dining_room: "Dining Room",
  painting: "Painting",
  exterior: "Exterior",
}
