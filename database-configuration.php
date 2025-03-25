
/**
 * Custom Booking Form Handler for WordPress
 * Handles form submission, database storage, and email confirmation
 * save this in code snippet php
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class CustomBookingFormHandler {
    private $table_name;

    public function __construct() {
        global $wpdb;
        
        // Use a custom table name with a unique prefix
        $this->table_name = $wpdb->prefix . 'custom_booking_submissions';
        
        // Hook into form submission
        add_action('init', array($this, 'process_booking_submission'));
        
        // Create custom table on plugin activation
        register_activation_hook(__FILE__, array($this, 'create_custom_booking_table'));
    }

    /**
     * Create custom booking submissions table
     */
    public function create_custom_booking_table() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE IF NOT EXISTS {$this->table_name} (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            category_id tinyint(2) NOT NULL,
            category_name varchar(100) NOT NULL,
            service_option_1 varchar(255) NOT NULL,
            service_option_2 varchar(255) NOT NULL,
            employee_id tinyint(2) NOT NULL,
            employee_name varchar(100) NOT NULL,
            booking_date date NOT NULL,
            booking_time time NOT NULL,
            customer_name varchar(100) NOT NULL,
            customer_phone varchar(20) NOT NULL,
            customer_email varchar(100) NOT NULL,
            booking_notes text,
            booking_reference varchar(20) NOT NULL,
            total_price decimal(10,2) NOT NULL,
            created_at timestamp DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id)
        ) {$charset_collate};";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }

    /**
     * Modify category labels based on category ID
     */
    private function modify_category_labels($category_id, $original_labels) {
        $modified_labels = $original_labels;

        switch ($category_id) {
            case 1: // Private Pickups
                $modified_labels['service_label_1'] = 'Pickup From';
                $modified_labels['service_label_2'] = 'Drop Off At';
                break;
            case 3: // Hotel/Accommodation
                $modified_labels['service_label_1'] = 'Options';
                $modified_labels['service_options_1'] = array('Hotel Room', 'Apartment', 'House');
                $modified_labels['service_label_2'] = 'Area or City';
                break;
            case 4: // Flight Tickets
                $modified_labels['service_label_1'] = 'Flight From';
                $modified_labels['service_label_2'] = 'Flight To';
                break;
            case 5: // Car/Truck Rental
                $modified_labels['service_label_1'] = 'Options';
                $modified_labels['service_options_1'] = array('Small Car', 'SUV', 'Truck', 'Tour Bus', 'Other');
                $modified_labels['service_label_2'] = 'Area or City';
                break;
            case 6: // Events and Tickets
                $modified_labels['service_label_1'] = 'Event Type / Description';
                $modified_labels['service_label_2'] = 'Area or City';
                break;
            case 7: // Help Me Find Something Else
                $modified_labels['service_label_1'] = 'Description';
                $modified_labels['service_label_2'] = 'Area or City';
                break;
        }

        return $modified_labels;
    }

    /**
     * Process booking submission
     */
    public function process_booking_submission() {
        // Check if this is our form submission
        if (!isset($_POST['form_id']) || !isset($_POST['current_step']) || $_POST['current_step'] != '4') {
            return;
        }
        
        // Verify nonce
        if (!isset($_POST['_wpnonce']) || !wp_verify_nonce($_POST['_wpnonce'], 'booking_form_submission')) {
            wp_die('Security check failed');
        }
        
        // Sanitize and prepare form data
        $form_data = $this->sanitize_form_data($_POST);
        
        // Generate unique booking reference
        $booking_reference = 'BK' . strtoupper(substr(uniqid(), -5));
        
        // Store booking in database
        $this->save_booking_to_database($form_data, $booking_reference);
        
        // Send confirmation email
        $this->send_booking_confirmation_email($form_data, $booking_reference);
        
        // Redirect with success status
        wp_redirect(add_query_arg('booking_status', 'success', get_permalink()));
        exit;
    }

    /**
     * Sanitize form data
     */
    private function sanitize_form_data($post_data) {
        return array(
            'category_id' => intval($post_data['category_id']),
            'service_option_1' => sanitize_text_field($post_data['service_option_1']),
            'service_option_2' => sanitize_text_field($post_data['service_option_2']),
            'employee' => intval($post_data['employee']),
            'booking_date' => sanitize_text_field($post_data['booking_date']),
            'booking_time' => sanitize_text_field($post_data['booking_time']),
            'customer_name' => sanitize_text_field($post_data['customer_name']),
            'customer_phone' => sanitize_text_field($post_data['customer_phone']),
            'customer_email' => sanitize_email($post_data['customer_email']),
            'booking_notes' => sanitize_textarea_field($post_data['booking_notes'] ?? ''),
        );
    }

    /**
     * Save booking to custom database table
     */
    private function save_booking_to_database($form_data, $booking_reference) {
        global $wpdb;
        
        // Get category mapping to retrieve category name
        $categories = get_category_mapping();
        $category_name = $categories[$form_data['category_id']]['name'];
        
        // Get employee details
        $employees = get_employee_options();
        $employee = array_filter($employees, function($emp) use ($form_data) {
            return $emp['id'] == $form_data['employee'];
        });
        $employee = reset($employee);
        
        $booking_data = array(
            'category_id' => $form_data['category_id'],
            'category_name' => $category_name,
            'service_option_1' => $form_data['service_option_1'],
            'service_option_2' => $form_data['service_option_2'],
            'employee_id' => $form_data['employee'],
            'employee_name' => $employee['name'],
            'booking_date' => date('Y-m-d', strtotime($form_data['booking_date'])),
            'booking_time' => date('H:i:s', strtotime($form_data['booking_time'])),
            'customer_name' => $form_data['customer_name'],
            'customer_phone' => $form_data['customer_phone'],
            'customer_email' => $form_data['customer_email'],
            'booking_notes' => $form_data['booking_notes'],
            'booking_reference' => $booking_reference,
            'total_price' => $employee['price']
        );
        
        $wpdb->insert($this->table_name, $booking_data);
    }

    /**
     * Send booking confirmation email
     */
    private function send_booking_confirmation_email($form_data, $booking_reference) {
        $to = $form_data['customer_email'];
        $subject = 'Booking Confirmation - Ref: ' . $booking_reference;
        
        // Get category mapping
        $categories = get_category_mapping();
        $category_name = $categories[$form_data['category_id']]['name'];
        
        // Get employee details
        $employees = get_employee_options();
        $employee = array_filter($employees, function($emp) use ($form_data) {
            return $emp['id'] == $form_data['employee'];
        });
        $employee = reset($employee);
        
        $message = sprintf(
            "Dear %s,\n\n" .
            "Your booking has been confirmed.\n\n" .
            "Booking Details:\n" .
            "Reference Number: %s\n" .
            "Service: %s\n" .
            "Service Details: %s - %s\n" .
            "Date: %s\n" .
            "Time: %s\n" .
            "Staff: %s\n" .
            "Total Price: $%.2f\n\n" .
            "Thank you for your booking!",
            $form_data['customer_name'],
            $booking_reference,
            $category_name,
            $form_data['service_option_1'],
            $form_data['service_option_2'],
            $form_data['booking_date'],
            $form_data['booking_time'],
            $employee['name'],
            $employee['price']
        );
        
        $headers = array('Content-Type: text/plain; charset=UTF-8');
        
        wp_mail($to, $subject, $message, $headers);
    }
}

// Initialize the custom booking form handler
new CustomBookingFormHandler();