import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import emailjs from '@emailjs/browser';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    try {
      await emailjs.send(serviceId, templateId, formData, publicKey);
      alert('Message sent successfully!');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again later.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const contactInfo = [
    {
      icon: <Phone className="h-6 w-6" />,
      title: 'Phone',
      details: ['7542889584', '9606364155'], // Updated phone number
      description: 'Call us for immediate assistance'
    },
    {
      icon: <Mail className="h-6 w-6" />,
      title: 'Email',
      details: ['adityakartikey1259@gmail.com'], // Removed paiakanksha1010@gmail.com
      description: 'Drop us a line anytime'
    },
    {
      icon: <MapPin className="h-6 w-6" />,
      title: 'Office',
      details: ['Nitte, Karkala, Karnataka'], // Removed XYZ
      description: 'Visit our headquarters'
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: 'Hours',
      details: ['Mon - Fri: 9:00 AM - 8:00 PM', 'Sat - Sun: 10:00 AM - 6:00 PM'],
      description: 'We\'re here when you need us'
    }
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />
      
      {/* Hero Section */}
      <section className="py-32 bg-gradient-to-r from-primary to-primary/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-black mb-6">
            Get in Touch
          </h1>
          <p className="text-xl text-black max-w-3xl mx-auto">
            Have questions about our services? We're here to help you.
          </p>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-3xl font-bold">Send us a Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    Fill out the form below and we'll get back to you within 24 hours.
                  </p>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Full Name *
                        </label>
                        <Input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Enter your full name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Phone Number
                        </label>
                        <Input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder=" 91-XXXXXXXXXX"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Email Address *
                      </label>
                      <Input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="your.email@example.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Subject
                      </label>
                      <Input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        placeholder="What's this about?"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Message *
                      </label>
                      <Textarea
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        placeholder="Tell us more about your inquiry..."
                        required
                        rows={6}
                      />
                    </div>

                <Button 
                  type="submit"
                  className="w-full"
                  size="lg"
                >
                  <Send className="h-5 w-5 mr-2" />
                  Send Message
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Powered by EmailJS
              </p>
            </CardContent>
              </Card>
            </div>

            {/* Contact Information */}
            <div>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Contact Information
                </h2>
                <p className="text-muted-foreground">
                  Reach out to us through any of these channels for quick assistance.
                </p>
              </div>

              <div className="space-y-6">
                {contactInfo.map((info, index) => (
                  <Card key={index} className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="bg-primary/10 rounded-lg p-3 text-primary">
                        {info.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">{info.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{info.description}</p>
                        {info.details.map((detail, idx) => (
                          <p key={idx} className="text-foreground font-medium">
                            {detail}
                          </p>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
