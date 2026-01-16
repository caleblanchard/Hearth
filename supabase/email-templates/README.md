# Supabase Email Templates for Hearth

This directory contains HTML email templates for all Supabase authentication email types. These templates are designed to match Hearth's brand identity with the ember (orange) and slate color scheme.

## Templates Included

1. **confirm-signup.html** - Email confirmation after user signs up
2. **invite-user.html** - Invitation email for new users
3. **magic-link.html** - Passwordless sign-in link
4. **change-email.html** - Email change confirmation
5. **reset-password.html** - Password reset link
6. **reauthentication.html** - Re-authentication for sensitive actions

## How to Use

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**
3. For each template type:
   - Click on the template (e.g., "Confirm sign up")
   - Click "Edit" or the template editor
   - Copy the contents of the corresponding HTML file
   - Paste into the template editor
   - Save the template

## Template Variables

Supabase provides these variables that are automatically replaced:

- `{{ .ConfirmationURL }}` - The confirmation/action URL
- `{{ .InvitedBy }}` - Name of the person who sent the invitation (for invite template)
- `{{ .Email }}` - User's email address
- `{{ .Token }}` - Confirmation token (if needed)

## Design Features

- **Responsive**: Works on desktop and mobile devices
- **Brand Colors**: Uses Hearth's ember (#E65100) and slate (#263238, #4A6572) color palette
- **Accessible**: Proper HTML structure and semantic markup
- **Professional**: Clean, modern design that matches Hearth's aesthetic

## Customization

You can customize these templates by:

1. Modifying the color scheme (search for hex codes like `#E65100`, `#263238`)
2. Updating the footer text
3. Adding your logo (replace the text "Hearth" with an image if desired)
4. Adjusting spacing and padding values

## Testing

After setting up templates in Supabase:

1. Test each email type in your development environment
2. Verify links work correctly
3. Check rendering on different email clients (Gmail, Outlook, Apple Mail)
4. Ensure mobile responsiveness

## Notes

- All templates use inline styles for maximum email client compatibility
- The templates are designed to work with Supabase's default variable system
- Make sure your Supabase project has email sending configured (SMTP settings)
