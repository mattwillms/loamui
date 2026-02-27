import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMe, useUpdateMe } from '@/api/users'

function ProfileSkeleton() {
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <Skeleton className="h-7 w-24" />
      </CardHeader>
      <CardContent className="space-y-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-24" />
      </CardContent>
    </Card>
  )
}

export function ProfilePage() {
  const { data: user, isLoading } = useMe()
  const updateMe = useUpdateMe()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [timezone, setTimezone] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? '')
      setLastName(user.last_name ?? '')
      setTimezone(user.timezone ?? '')
      setZipCode(user.zip_code ?? '')
    }
  }, [user])

  if (isLoading) return <ProfileSkeleton />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await updateMe.mutateAsync({
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        timezone: timezone.trim() || undefined,
        zip_code: zipCode.trim() || undefined,
      })
      toast.success('Profile updated.')
    } catch {
      setError('Failed to update profile. Please try again.')
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account info</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Editable fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile-first-name">First Name</Label>
                <Input
                  id="profile-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-last-name">Last Name</Label>
                <Input
                  id="profile-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-timezone">Timezone</Label>
              <Input
                id="profile-timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. America/New_York"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-zip">Zip Code</Label>
              <Input
                id="profile-zip"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="e.g. 97401"
              />
            </div>

            {/* Read-only fields */}
            <div className="space-y-4 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                The fields below are managed automatically.
              </p>

              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Email</p>
                <p className="text-sm text-muted-foreground">{user?.email ?? '—'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Hardiness Zone</p>
                <p className="text-sm text-muted-foreground">{user?.hardiness_zone ?? '—'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Latitude</p>
                  <p className="text-sm text-muted-foreground">
                    {user?.latitude != null ? user.latitude : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Longitude</p>
                  <p className="text-sm text-muted-foreground">
                    {user?.longitude != null ? user.longitude : '—'}
                  </p>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={updateMe.isPending}>
              {updateMe.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
