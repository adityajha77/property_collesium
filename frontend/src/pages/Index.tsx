import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
const Index = () => {
  return (
    <div className="min-h-screen bg-background relative">
      {/* Animated background */}
      <div className="fixed inset-0 parallax-bg -z-10" />
      
      <Navbar />
      <Hero/>

      {/* Why Choose Tokenized Estate Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 gradient-text">Why Choose Tokenized Estate?</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-12">
            Unlock the power of fractional ownership, global accessibility, and transparent transactions with blockchain-powered real estate.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-card/60 backdrop-blur-lg border-border/50">
              <CardHeader>
                <CardTitle className="gradient-text">Fractional Ownership</CardTitle>
                <CardDescription>Invest in a fraction of a property, making real estate accessible to everyone.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Lower entry barriers, higher diversification potential.</p>
              </CardContent>
            </Card>
            <Card className="bg-card/60 backdrop-blur-lg border-border/50">
              <CardHeader>
                <CardTitle className="gradient-text">Global Accessibility</CardTitle>
                <CardDescription>Invest in properties worldwide, without geographical limitations.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Expand your portfolio across international markets.</p>
              </CardContent>
            </Card>
            <Card className="bg-card/60 backdrop-blur-lg border-border/50">
              <CardHeader>
                <CardTitle className="gradient-text">Transparent Transactions</CardTitle>
                <CardDescription>All transactions are recorded on the blockchain, ensuring transparency and security.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Immutable records for complete peace of mind.</p>
              </CardContent>
            </Card>
            <Card className="bg-card/60 backdrop-blur-lg border-border/50">
              <CardHeader>
                <CardTitle className="gradient-text">Liquidity</CardTitle>
                <CardDescription>Easily buy and sell your tokenized property shares on our marketplace.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Greater flexibility compared to traditional real estate.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 gradient-text">How It Works</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-12">
            Our platform simplifies real estate investment through a few easy steps.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-card/60 backdrop-blur-lg border-border/50">
              <CardHeader>
                <CardTitle className="gradient-text">1. Browse Properties</CardTitle>
                <CardDescription>Explore a diverse portfolio of tokenized real estate assets.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">From residential to commercial, find your next investment.</p>
              </CardContent>
            </Card>
            <Card className="bg-card/60 backdrop-blur-lg border-border/50">
              <CardHeader>
                <CardTitle className="gradient-text">2. Invest with Ease</CardTitle>
                <CardDescription>Purchase fractional shares using your preferred cryptocurrency.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Secure and instant transactions on the blockchain.</p>
              </CardContent>
            </Card>
            <Card className="bg-card/60 backdrop-blur-lg border-border/50">
              <CardHeader>
                <CardTitle className="gradient-text">3. Earn & Trade</CardTitle>
                <CardDescription>Receive rental income and trade your tokens on our liquidity pool.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Maximize your returns with a dynamic marketplace.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>


      {/* FAQs Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold mb-6 text-center gradient-text">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg font-semibold text-foreground hover:text-primary">What is tokenization?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Tokenization is the process of converting real-world assets, like real estate, into digital tokens on a blockchain. Each token represents a fractional ownership of the asset.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg font-semibold text-foreground hover:text-primary">How secure are my investments?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                All transactions and ownership records are secured on the Solana blockchain, providing immutable and transparent proof of ownership. Our platform employs industry-standard security measures.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg font-semibold text-foreground hover:text-primary">What about liquidity?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Our platform includes a dedicated liquidity pool and marketplace, allowing you to easily buy and sell your tokenized property shares, offering greater liquidity than traditional real estate.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger className="text-lg font-semibold text-foreground hover:text-primary">Are there any regulations?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We operate within applicable legal frameworks and strive to ensure compliance with relevant regulations concerning digital assets and real estate. Specific regulations may vary by jurisdiction.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Ready to Start Investing Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary/20 to-secondary/20">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 text-black">Ready to Start Investing?</h2>
          <p className="text-lg text-black/80 max-w-3xl mx-auto mb-8">
            Join thousands of investors already earning rewards with our innovative investing platform.
          </p>
          <Link to="/marketplace">
            <Button size="lg" className="bg-gradient-primary text-black text-lg px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
              Explore Marketplace
            </Button>
          </Link>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border/50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-6">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-primary rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="text-xl font-bold gradient-text">TokenEstate</span>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The future of real estate investment. Powered by Solana blockchain technology.
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            © 2024 TokenEstate. Built with ❤️ for the Web3 community.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
