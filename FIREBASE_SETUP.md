# Firebase ACL Setup Guide

This project now uses Firebase Authentication and Firestore for Access Control Lists (ACLs). Only users with the "Admin" role can edit announcements and calendar events. Unauthenticated users can still view the app in read-only mode.

## Initial Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Once created, click on the web icon (</>) to add a web app
4. Copy the Firebase configuration values

### 2. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and replace the placeholder values with your Firebase config from step 1

### 3. Enable Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Click on **Google** and enable it
3. Add your project's authorized domains (localhost is already included by default)

### 4. Create Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** for development (we'll secure it later)
4. Select a region close to your users

### 5. Set Up Firestore Collections

Create a `roles` collection to manage admin users:

1. In Firestore Database, click **Start collection**
2. Collection ID: `roles`
3. Add a document:
   - **Document ID**: Use the UID of your Google account (you'll see this after signing in)
   - **Field**: `isAdmin` (boolean) = `true`

**To find your UID after first sign-in:**
- Sign in to the app using Google
- Check the browser console or Firebase Console > Authentication > Users
- Copy your UID and create a role document with that ID

### 6. Configure Firestore Security Rules

Replace the default Firestore rules with these to enforce fine-grained ACLs:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is a global admin
    function isAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/roles/$(request.auth.uid)).data.isAdmin == true;
    }

    // Helper function to check if user can edit a specific document
    function canEdit(data) {
      return isAdmin() || 
             (request.auth != null && (
               data.ownerId == request.auth.uid ||
               request.auth.uid in data.allowedEditors ||
               get(/databases/$(database)/documents/roles/$(request.auth.uid)).data.groups.hasAny(data.allowedGroups)
             ));
    }
    
    // Roles collection - users can read their own, only admins can write
    match /roles/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if isAdmin();
    }
    
    // Announcements collection
    match /announcements/{announcementId} {
      allow read: if true; // Public read
      allow write: if canEdit(resource.data) || (request.method == 'create' && canEdit(request.resource.data));
    }
    
    // Events collection
    match /events/{eventId} {
      allow read: if true; // Public read
      allow write: if canEdit(resource.data) || (request.method == 'create' && canEdit(request.resource.data));
    }
  }
}
```

## Managing Permissions

The app supports fine-grained access control for both Announcements and Calendar Events.

### Permission Levels

1.  **Global Admin**: Any user with `isAdmin: true` in their `roles/{uid}` document can edit/delete *any* content.
2.  **Owner**: The user who created the item (`ownerId`) can always edit/delete it.
3.  **Allowed Editors**: A list of specific User IDs (UIDs) who are granted edit access to a specific item.
4.  **Allowed Groups**: A list of group names. Any user who belongs to one of these groups (defined in their `roles/{uid}` document) can edit the item.

### Finding User IDs (UIDs)

To grant specific users edit access, you need their Firebase UID:

1.  **From Firebase Console**: Go to **Authentication** > **Users**. The UID is listed in the "User UID" column.
2.  **From the App**: When a user is signed in, their UID is available in the `AuthContext`. You can also find it in the `roles` collection in Firestore if they have a role document.

### Managing Groups

To assign a user to a group:

1.  In Firestore, find the user's document in the `roles` collection (ID is their UID).
2.  Add or update the `groups` field as an **Array** of strings.
    - Example: `groups: ["staff", "moderators"]`
3.  In the app, you can now add "staff" to the **Allowed Groups** field of any announcement or event to grant all staff members edit access.

## How It Works

### Authentication Flow

1. **Unauthenticated Users**: Can view all content but cannot edit anything.
2. **Authenticated Users**: Can sign in with Google. Their permissions depend on their role and the specific content.
3. **Admin Users**: Global admins can edit any content.

### Fine-Grained Permissions

Each piece of content (announcement or event) can have:
- `ownerId`: The UID of the user who owns/created the item.
- `allowedEditors`: An array of UIDs who are specifically allowed to edit this item.
- `allowedGroups`: An array of group names. Any user belonging to one of these groups can edit the item.

The `canEdit` utility in the frontend and the Firestore Security Rules both enforce these checks.

### UI Changes

- **Settings Tab**: Now shows sign in/sign out buttons instead of admin mode toggle
- **Edit Buttons**: Only visible when `isAdmin` is true
- **Anonymous Access**: Users can browse without signing in

## Development

### Running Locally

```bash
npm run dev
```

The app will use your Firebase project credentials from `.env.local`.

### Testing with Multiple Users

1. Sign in with your admin account (the one you added to `roles` collection)
2. Try editing - it should work
3. Sign out and sign in with a different Google account
4. Try editing - it should show no edit buttons
5. Sign out to test anonymous/guest mode - you should see content but no edit options

## Migrating Data to Firestore

Currently, announcements and events are hardcoded in the app. To persist them to Firestore:

### Option 1: Manual Entry
1. Go to Firebase Console > Firestore Database
2. Create `announcements` and `events` collections
3. Add documents manually with the appropriate fields

### Option 2: Programmatic Migration (Future Enhancement)
- Add a migration function that pushes the hardcoded data to Firestore on first load
- Update components to read from Firestore instead of local state

## Security Notes

- ⚠️ Never commit `.env.local` to version control
- ⚠️ Update Firestore Security Rules before deploying to production
- ⚠️ "Test mode" rules allow anyone to write - always update them!
- ⚠️ Consider adding audit logging for admin actions
- ⚠️ Regularly review who has admin access in the `roles` collection

## Troubleshooting

### "Auth Error" or "Firebase not initialized"
- Ensure `.env.local` exists with valid Firebase config
- Check that all VITE_FIREBASE_* variables are set
- Restart the dev server after changing `.env.local`

### "Permission denied" when trying to edit as admin
- Verify your UID exists in the `roles` collection
- Check that `isAdmin` field is set to `true` (boolean, not string)
- Review Firestore Security Rules in Firebase Console

### Sign-in popup blocked
- Allow popups for localhost in your browser
- Try using a different browser or incognito mode

### Can't see changes after editing
- Data is currently in-memory only - refresh will reset changes
- Implement Firestore integration to persist changes across sessions
