const Footer = () => {
    return (
        <footer className="footer bg-light pt-5 pb-5">
            <div className="container">
                <div className="row">
                    <p className="text-muted small mb-4 mb-lg-0">&copy; ADAD Final Project {new Date().getFullYear()}</p>
                </div>
            </div>
        </footer>
    );
}
 
export default Footer;